import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/web-push";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { getTransactionsInRange, getUserCategories, getUserSettings } from "@/services/transaction";
import { getSubscriptionsOfUser, removeStaleSubscription } from "@/services/push";
import type { BudgetCategory, Transaction, UserSettings } from "@/features/web/types";
import { computeCycleStats, type CycleStats } from "@/features/web/utils/stats";
import {
  getCurrentCycle,
  shiftCycle,
  formatDateLabel,
  formatCycleLabel,
} from "@/features/web/utils/cycle";
import { formatShortIDR } from "@/utils/helpers";
import {
  BASE_URL,
  NOTIFICATION_LOCALE,
  META_APP,
} from "@/utils/config/variables";

/** Nama aplikasi untuk header/tanda tangan email (fallback bila env kosong). */
const APP_NAME = META_APP ?? "Savings Goal Tracker";

/**
 * Builder payload notifikasi (web push + email) — PER USER.
 *
 * Setiap user punya settings (cycleStartDay, savingsInitial) dan kategori
 * sendiri; semua statistik dihitung dalam konteks user tsb.
 *
 * Channel per notifikasi:
 * - tracking-nudge (B1)      → web push
 * - category-spotlight (C1)   → web push
 * - cycle-reset (D1)          → web push
 * - new-cycle-kickoff (D2+D4) → email
 * - monthly-summary (D3)     → email
 * - csv-export-reminder (E2) → email
 * - quarterly-trend (E1)      → email
 * - yearly-recap (F1)        → email
 */

/** Pilih teks sesuai locale notifikasi. */
function L(id: string, en: string): string {
  return NOTIFICATION_LOCALE === "en" ? en : id;
}

/** Konteks keuangan satu user untuk membangun notifikasi. */
export interface UserFinance {
  userId: string;
  email: string;
  name: string;
  settings: UserSettings;
  categories: BudgetCategory[];
  catMap: Map<string, BudgetCategory>;
}

async function loadUserFinance(user: {
  id: string;
  email: string;
  name: string;
}): Promise<UserFinance> {
  const [settings, categories] = await Promise.all([
    getUserSettings(user.id),
    getUserCategories(user.id),
  ]);
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    settings,
    categories,
    catMap: new Map(categories.map((c) => [c.id, c])),
  };
}

/** Ambil transaksi satu siklus milik user. */
async function getCycleTransactions(
  ctx: UserFinance,
  start: Date,
  end: Date,
): Promise<Transaction[]> {
  return getTransactionsInRange(ctx.userId, start, end);
}

function statsOf(ctx: UserFinance, transactions: Transaction[]): CycleStats {
  return computeCycleStats(
    transactions,
    ctx.categories,
    ctx.settings.savingsInitial,
  );
}

export interface NotificationPayload {
  title: string;
  body: string;
  tag: string;
  url: string;
  /** Versi HTML email kaya (kartu). Hanya untuk channel email. */
  html?: string;
  /** Preheader email (preview text di inbox). */
  previewText?: string;
  /** Ikon push notification (path absolut). */
  icon?: string;
  /** Badge push notification (path absolut). */
  badge?: string;
}

/** Ikon & badge push default. */
const PUSH_ICON = "/android/launchericon-192x192.png";
const PUSH_BADGE = "/android/launchericon-96x96.png";

// ---------------------------------------------------------------------------
// B1 – Tracking Nudge (Pengingat Belum Mencatat) — web push
// ---------------------------------------------------------------------------

/** Cek apakah sebuah transaksi terjadi hari ini (lokal). */
function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export async function buildTrackingNudge(
  ctx: UserFinance,
): Promise<NotificationPayload | null> {
  const cycle = getCurrentCycle(ctx.settings.cycleStartDay);
  const transactions = await getCycleTransactions(
    ctx,
    cycle.startDate,
    cycle.endDate,
  );
  const stats = statsOf(ctx, transactions);

  const todayTransactions = transactions.filter((t) => isToday(t.date));
  if (todayTransactions.length > 0) return null;

  const cycleLabel = formatCycleLabel(
    cycle.year,
    cycle.monthIndex,
    NOTIFICATION_LOCALE,
  );
  const body = L(
    `Belum ada pengeluaran dicatat hari ini. Catat sekarang biar tidak lupa besok. Total siklus ${cycleLabel}: ${formatShortIDR(stats.totalSpent)}.`,
    `No spending logged today. Log it now so you don't forget tomorrow. ${cycleLabel} cycle total: ${formatShortIDR(stats.totalSpent)}.`,
  );

  return {
    title: L(`📝 Belum Mencatat Hari Ini`, `📝 Nothing Logged Today`),
    body,
    tag: "tracking-nudge",
    url: "/",
    icon: PUSH_ICON,
    badge: PUSH_BADGE,
  };
}

// ---------------------------------------------------------------------------
// C1 – Category Spotlight — web push
// ---------------------------------------------------------------------------

export async function buildCategorySpotlight(
  ctx: UserFinance,
): Promise<NotificationPayload> {
  const cycle = getCurrentCycle(ctx.settings.cycleStartDay);
  const transactions = await getCycleTransactions(
    ctx,
    cycle.startDate,
    cycle.endDate,
  );

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recent = transactions.filter(
    (t) => new Date(t.date) >= sevenDaysAgo,
  );

  if (recent.length === 0) {
    return {
      title: L("📊 Sorotan Mingguan", "📊 Weekly Spotlight"),
      body: L(
        `Tidak ada pengeluaran dalam 7 hari terakhir. Mungkin bisa mulai mencatat?`,
        `No spending in the last 7 days. Maybe start logging some?`,
      ),
      tag: "category-spotlight",
      url: "/",
      icon: PUSH_ICON,
      badge: PUSH_BADGE,
    };
  }

  const weekByCategory = new Map<string, number>();
  for (const t of recent) {
    if (t.type !== "EXPENSE") continue;
    weekByCategory.set(
      t.categoryId,
      (weekByCategory.get(t.categoryId) ?? 0) + t.amount,
    );
  }

  let topCatId: string | null = null;
  let topAmount = 0;
  for (const [id, amount] of weekByCategory) {
    if (amount > topAmount) {
      topCatId = id;
      topAmount = amount;
    }
  }

  if (!topCatId) {
    return {
      title: L("📊 Sorotan Mingguan", "📊 Weekly Spotlight"),
      body: L(
        `${recent.length} transaksi minggu ini. Semua berjalan lancar!`,
        `${recent.length} transactions this week. Everything looks good!`,
      ),
      tag: "category-spotlight",
      url: "/",
      icon: PUSH_ICON,
      badge: PUSH_BADGE,
    };
  }

  const topCat = ctx.catMap.get(topCatId)!;
  const spentThisCycle = transactions
    .filter((t) => t.type === "EXPENSE" && t.categoryId === topCatId)
    .reduce((acc, t) => acc + t.amount, 0);
  const catRemaining = Math.max(0, topCat.allocation - spentThisCycle);

  return {
    title: L("📊 Alokasi Mingguan", "📊 Weekly Allocation"),
    body: L(
      `Minggu ini pengeluaran ${topCat.name} naik ${formatShortIDR(topAmount)}. Alokasi tersisa ${formatShortIDR(catRemaining)} untuk sisa siklus.`,
      `${topCat.name} spending rose ${formatShortIDR(topAmount)} this week. ${formatShortIDR(catRemaining)} allocation left for the rest of the cycle.`,
    ),
    tag: "category-spotlight",
    url: "/",
    icon: PUSH_ICON,
    badge: PUSH_BADGE,
  };
}

// ---------------------------------------------------------------------------
// D1 – Cycle Reset Reminder — web push
// ---------------------------------------------------------------------------

export async function buildCycleResetReminder(
  ctx: UserFinance,
): Promise<NotificationPayload> {
  const cycle = getCurrentCycle(ctx.settings.cycleStartDay);
  const nextCycle = shiftCycle(cycle, 1, ctx.settings.cycleStartDay);
  const todayStr = formatDateLabel(new Date(), NOTIFICATION_LOCALE);
  const nextStartDateStr = formatDateLabel(
    nextCycle.startDate,
    NOTIFICATION_LOCALE,
  );

  const transactions = await getCycleTransactions(
    ctx,
    cycle.startDate,
    cycle.endDate,
  );
  const stats = statsOf(ctx, transactions);
  const cycleLabel = formatCycleLabel(
    cycle.year,
    cycle.monthIndex,
    NOTIFICATION_LOCALE,
  );

  let body: string;
  if (stats.overLimit) {
    body = L(
      `Siklus ${cycleLabel} berakhir besok! ⚠️ Pengeluaran sudah melebihi limit (${formatShortIDR(stats.totalSpent)} dari ${formatShortIDR(stats.spendingLimit)}). Pastikan semua pengeluaran sudah tercatat sebelum ${nextStartDateStr}.`,
      `The ${cycleLabel} cycle ends tomorrow! ⚠️ Spending has exceeded the limit (${formatShortIDR(stats.totalSpent)} of ${formatShortIDR(stats.spendingLimit)}). Make sure everything is recorded before ${nextStartDateStr}.`,
    );
  } else {
    body = L(
      `Siklus ${cycleLabel} berakhir besok (${todayStr}). Sisa limit ${formatShortIDR(stats.limitRemaining)}. Pastikan semua pengeluaran sudah tercatat sebelum ${nextStartDateStr}.`,
      `The ${cycleLabel} cycle ends tomorrow (${todayStr}). ${formatShortIDR(stats.limitRemaining)} limit remaining. Make sure all spending is recorded before ${nextStartDateStr}.`,
    );
  }

  return {
    title: L(
      `⏰ Siklus ${cycleLabel} Berakhir Besok!`,
      `⏰ ${cycleLabel} Cycle Ends Tomorrow!`,
    ),
    body,
    tag: "cycle-reset",
    url: "/",
    icon: PUSH_ICON,
    badge: PUSH_BADGE,
  };
}

// ---------------------------------------------------------------------------
// D2 + D4 – New Cycle Kickoff + Allocation Suggestion — email
// ---------------------------------------------------------------------------

export async function buildNewCycleKickoff(
  ctx: UserFinance,
): Promise<NotificationPayload> {
  const cycle = getCurrentCycle(ctx.settings.cycleStartDay);
  const startDateStr = formatDateLabel(cycle.startDate, NOTIFICATION_LOCALE);
  const link = `${BASE_URL}/`;
  const startDay = ctx.settings.cycleStartDay;
  const initial = ctx.settings.savingsInitial;

  const prev1 = shiftCycle(cycle, -1, startDay);
  const prev2 = shiftCycle(cycle, -2, startDay);
  const prev3 = shiftCycle(cycle, -3, startDay);

  const [t1, t2, t3] = await Promise.all([
    getCycleTransactions(ctx, prev1.startDate, prev1.endDate),
    getCycleTransactions(ctx, prev2.startDate, prev2.endDate),
    getCycleTransactions(ctx, prev3.startDate, prev3.endDate),
  ]);

  const statsList = [t1, t2, t3].map((t) => statsOf(ctx, t));
  const suggestions = buildAllocationSuggestions(ctx, statsList);

  const themeColor = "#22c55e";
  const cycleLabel = formatCycleLabel(
    cycle.year,
    cycle.monthIndex,
    NOTIFICATION_LOCALE,
  );

  const emailTitle = L(
    `🚀 Siklus Baru ${cycleLabel} Dimulai!`,
    `🚀 New ${cycleLabel} Cycle Begins!`,
  );
  const subtitle = `${APP_NAME} · ${L(`Mulai ${startDateStr}`, `Starts ${startDateStr}`)}`;
  const previewText = L(
    `Siklus baru ${cycleLabel} dimulai! Saldo awal ${formatShortIDR(initial)}.${suggestions.length > 0 ? ` ${suggestions.length} saran realokasi wadah.` : ""}`,
    `New ${cycleLabel} cycle starts! Initial balance ${formatShortIDR(initial)}.${suggestions.length > 0 ? ` ${suggestions.length} envelope allocation suggestions.` : ""}`,
  );
  const greeting = L(
    "Selamat memulai siklus baru! 🎉",
    "A fresh cycle begins! 🎉",
  );
  const bluf = L(
    `Siklus <strong>${cycleLabel}</strong> resmi dimulai hari ini dengan wadah yang sudah direset. Semoga lebih hemat dari siklus lalu! 💪`,
    `The <strong>${cycleLabel}</strong> cycle officially starts today with envelopes reset. Hope you save more than last cycle! 💪`,
  );
  const ctaText = L("Buka Dashboard", "Open Dashboard");

  const categoryHeader = L(
    "Alokasi Wadah & Saran Realokasi",
    "Envelope Allocation & Suggestions",
  );
  const categories = ctx.categories.map((cat, i) => {
    const s = statsList.map((st) => st.categories[i]?.spent ?? 0);
    const validSpent = s.filter((v) => v > 0);
    const avgSpent =
      validSpent.length > 0
        ? Math.round(validSpent.reduce((a, b) => a + b, 0) / validSpent.length)
        : 0;

    let indicator = "";
    if (validSpent.length >= 2) {
      const alwaysOver =
        validSpent.filter((v) => v > cat.allocation).length >= validSpent.length;
      const alwaysUnder =
        validSpent.filter((v) => v < cat.allocation * 0.7).length >=
        validSpent.length;
      if (alwaysOver) {
        indicator = L("⚠️ Sering melebihi", "⚠️ Often exceeds");
      } else if (alwaysUnder) {
        indicator = L("✅ Sisa berlebih", "✅ Underutilized");
      }
    }

    const detail =
      validSpent.length > 0
        ? `${formatShortIDR(cat.allocation)} · ${L("rata-rata", "avg")} ${formatShortIDR(avgSpent)}${indicator ? ` ${indicator}` : ""}`
        : formatShortIDR(cat.allocation);

    return { name: cat.name, detail, dotColor: cat.color };
  });

  let closing: string;
  if (suggestions.length > 0) {
    closing = L(
      `💡 <strong>${suggestions.length} Saran Realokasi:</strong><br/>${suggestions.join("<br/>")}`,
      `💡 <strong>${suggestions.length} Allocation Suggestions:</strong><br/>${suggestions.join("<br/>")}`,
    );
  } else {
    closing = L(
      "Terima kasih sudah konsisten menabung. Tetap catat pengeluaranmu! 💪",
      "Thanks for staying consistent. Keep tracking your spending! 💪",
    );
  }

  const signature = L(
    `Salam hangat,<br/><strong style="color:#1f2937">${APP_NAME}</strong>`,
    `Best regards,<br/><strong style="color:#1f2937">${APP_NAME}</strong>`,
  );

  const html = buildRichEmailHtml({
    themeColor,
    title: emailTitle,
    subtitle,
    greeting,
    bluf,
    previewText,
    metrics: [
      {
        label: L("Saldo Awal", "Initial Balance"),
        value: formatShortIDR(initial),
        color: "#22c55e",
      },
      {
        label: L("Sisa Limit", "Limit Remaining"),
        value: formatShortIDR(statsList[0].spendingLimit - statsList[0].totalSpent),
        color: "#4f46e5",
      },
    ],
    categoryHeader,
    categories,
    ctaText,
    ctaUrl: link,
    closing,
    signature,
  });

  const body = L(
    `Siklus baru ${cycleLabel} dimulai! Saldo awal ${formatShortIDR(initial)} dengan wadah siap diisi. Semangat menabung!${suggestions.length > 0 ? ` 💡 ${suggestions[0]}` : ""}`,
    `New ${cycleLabel} cycle begins! Starting balance ${formatShortIDR(initial)} across fresh envelopes. Let's save!${suggestions.length > 0 ? ` 💡 ${suggestions[0]}` : ""}`,
  );

  return {
    title: emailTitle,
    body,
    tag: "new-cycle-kickoff",
    url: "/",
    html,
    previewText,
  };
}

function buildAllocationSuggestions(
  ctx: UserFinance,
  statsList: CycleStats[],
): string[] {
  if (statsList.length === 0) return [];

  const suggestions: string[] = [];
  for (const cat of ctx.categories) {
    const spentValues = statsList
      .map((s) => s.categories.find((c) => c.categoryId === cat.id)?.spent ?? 0)
      .filter((v) => v > 0);
    if (spentValues.length < 1) continue;

    const avgSpent = Math.round(
      spentValues.reduce((a, b) => a + b, 0) / spentValues.length,
    );
    const alwaysOver =
      spentValues.filter((v) => v > cat.allocation).length === spentValues.length;
    const alwaysUnder =
      spentValues.filter((v) => v < cat.allocation * 0.7).length ===
      spentValues.length;

    if (alwaysOver && cat.allocation > 0) {
      suggestions.push(
        L(
          `Naikkan ${cat.name}: rata-rata ${formatShortIDR(avgSpent)}/siklus, melebihi alokasi ${formatShortIDR(cat.allocation)}.`,
          `Increase ${cat.name}: averages ${formatShortIDR(avgSpent)}/cycle, exceeds allocation of ${formatShortIDR(cat.allocation)}.`,
        ),
      );
    } else if (alwaysUnder && cat.allocation > 0) {
      suggestions.push(
        L(
          `Kurangi ${cat.name}: rata-rata ${formatShortIDR(avgSpent)}/siklus dari alokasi ${formatShortIDR(cat.allocation)}. Alihkan ke wadah lain.`,
          `Reduce ${cat.name}: averages ${formatShortIDR(avgSpent)}/cycle from allocation ${formatShortIDR(cat.allocation)}. Reallocate to other envelopes.`,
        ),
      );
    }
  }

  return suggestions.slice(0, 5);
}

// ---------------------------------------------------------------------------
// D3 – Monthly Summary — email
// ---------------------------------------------------------------------------

export async function buildMonthlySummary(
  ctx: UserFinance,
): Promise<NotificationPayload> {
  const startDay = ctx.settings.cycleStartDay;
  const cycle = getCurrentCycle(startDay);
  const prevCycle = shiftCycle(cycle, -1, startDay);

  const [currentTx, prevTx] = await Promise.all([
    getCycleTransactions(ctx, cycle.startDate, cycle.endDate),
    getCycleTransactions(ctx, prevCycle.startDate, prevCycle.endDate),
  ]);

  const stats = statsOf(ctx, currentTx);
  const prevStats = statsOf(ctx, prevTx);

  const topCategories = stats.categories
    .filter((c) => c.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 3);

  const diff = stats.totalSpent - prevStats.totalSpent;
  const diffLabel =
    diff > 0
      ? `+${formatShortIDR(diff)}`
      : diff < 0
        ? L(
            `hemat ${formatShortIDR(Math.abs(diff))}`,
            `saved ${formatShortIDR(Math.abs(diff))}`,
          )
        : L("sama", "same");

  const remainingLimitPercent =
    stats.spendingLimit > 0
      ? Math.max(0, Math.round((stats.limitRemaining / stats.spendingLimit) * 100))
      : 0;

  const topDates = [...currentTx]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)
    .map((t) => {
      const cat = ctx.catMap.get(t.categoryId);
      const dateLabel = formatDateLabel(new Date(t.date), NOTIFICATION_LOCALE);
      return {
        name: `${t.name} (${dateLabel})`,
        detail: `${formatShortIDR(t.amount)} · ${cat?.name ?? t.categoryId}`,
        dotColor: cat?.color ?? "#6b7280",
      };
    });

  const themeColor = "#4f46e5";
  const cycleLabel = formatCycleLabel(
    cycle.year,
    cycle.monthIndex,
    NOTIFICATION_LOCALE,
  );
  const prevLabel = formatCycleLabel(
    prevCycle.year,
    prevCycle.monthIndex,
    NOTIFICATION_LOCALE,
  );

  const previewText = L(
    `Siklus ${cycleLabel} selesai. Total pengeluaran ${formatShortIDR(stats.totalSpent)}, sisa limit ${remainingLimitPercent}%.${diff < 0 ? ` Hemat ${formatShortIDR(Math.abs(diff))} dari ${prevLabel}.` : ""} Lihat rekap lengkap.`,
    `${cycleLabel} cycle complete. Total spent ${formatShortIDR(stats.totalSpent)}, ${remainingLimitPercent}% limit remaining.${diff < 0 ? ` Saved ${formatShortIDR(Math.abs(diff))} vs ${prevLabel}.` : ""} See the full recap.`,
  );

  const limitColor = stats.overLimit
    ? "#ef4444"
    : remainingLimitPercent <= 20
      ? "#f59e0b"
      : "#22c55e";

  const emailTitle = L(
    `📊 Rekap Akhir Siklus ${cycleLabel}`,
    `📊 End-of-Cycle Recap: ${cycleLabel}`,
  );
  const subtitle = `${APP_NAME} · ${L(`Siklus ${cycleLabel}`, `Cycle ${cycleLabel}`)}`;
  const greeting = L("Halo! 👋", "Hello! 👋");

  const comparisonNote =
    diff > 0
      ? L(
          `Pengeluaran naik <strong>${formatShortIDR(diff)}</strong> dibanding ${prevLabel}.`,
          `Spending rose by <strong>${formatShortIDR(diff)}</strong> compared to ${prevLabel}.`,
        )
      : diff < 0
        ? L(
            `Pengeluaran turun <strong>${formatShortIDR(Math.abs(diff))}</strong> dibanding ${prevLabel}.`,
            `Spending dropped by <strong>${formatShortIDR(Math.abs(diff))}</strong> compared to ${prevLabel}.`,
          )
        : L(
            `Pengeluaran sama dengan ${prevLabel}.`,
            `Spending is the same as ${prevLabel}.`,
          );

  const bluf = L(
    `<strong>Ringkasan siklus ${cycleLabel}:</strong> ${comparisonNote}`,
    `<strong>${cycleLabel} cycle summary:</strong> ${comparisonNote}`,
  );
  const categoryHeader = L("Pengeluaran per Wadah", "Spending by Envelope");
  const ctaText = L("Buka Dashboard Lengkap", "Open Full Dashboard");
  const link = `${BASE_URL}/`;

  const categoryInsights = stats.categories
    .filter((c) => c.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5)
    .map((c) => ({
      name: c.name,
      detail: `${formatShortIDR(c.spent)} · ${c.percent}%`,
      dotColor: c.color,
    }));

  let closing: string;
  if (stats.overLimit) {
    closing = L(
      "Pengeluaran melebihi limit wadah. Evaluasi kategori yang paling boros untuk siklus berikutnya! 💪",
      "Spending exceeded the envelope limit. Review the biggest categories for next cycle! 💪",
    );
  } else if (diff < 0) {
    closing = L(
      `Mantap! Anda hemat ${formatShortIDR(Math.abs(diff))} dibanding siklus ${prevLabel}. Terus pertahankan! 💪`,
      `Great job! You saved ${formatShortIDR(Math.abs(diff))} compared to the ${prevLabel} cycle. Keep it up! 💪`,
    );
  } else {
    closing = L(
      `Siklus ${cycleLabel} selesai. Terima kasih sudah mencatat pengeluaran. Tetap konsisten menabung! 💪`,
      `${cycleLabel} cycle complete. Thanks for tracking your spending. Stay consistent! 💪`,
    );
  }
  const signature = L(
    `Salam hangat,<br/><strong style="color:#1f2937">${APP_NAME}</strong>`,
    `Best regards,<br/><strong style="color:#1f2937">${APP_NAME}</strong>`,
  );

  const html = buildRichEmailHtml({
    themeColor,
    title: emailTitle,
    subtitle,
    greeting,
    bluf,
    previewText,
    metrics: [
      {
        label: L("Total Pengeluaran", "Total Spent"),
        value: formatShortIDR(stats.totalSpent),
        color: "#1f2937",
      },
      {
        label: L("Penggunaan Alokasi Wadah", "Envelope Usage"),
        value: `${remainingLimitPercent}% ${L("sisa", "left")}`,
        color: limitColor,
      },
    ],
    categoryHeader,
    categories: categoryInsights,
    extraSections:
      topDates.length > 0
        ? [
            {
              header: L(
                "Top 3 Tanggal Pengeluaran Terbesar",
                "Top 3 Highest Spending Dates",
              ),
              rows: topDates,
            },
          ]
        : [],
    ctaText,
    ctaUrl: link,
    closing,
    signature,
  });

  const topCatNames = topCategories.map((c) => c.name).join(", ");
  const body = L(
    `Siklus ${cycleLabel} selesai. Total pengeluaran ${formatShortIDR(stats.totalSpent)}, sisa limit ${remainingLimitPercent}%.${topCatNames ? ` Wadah terboros: ${topCatNames}.` : ""} vs ${prevLabel}: ${diffLabel}.`,
    `${cycleLabel} cycle complete. Total spent ${formatShortIDR(stats.totalSpent)}, ${remainingLimitPercent}% limit remaining.${topCatNames ? ` Top spending: ${topCatNames}.` : ""} vs ${prevLabel}: ${diffLabel}.`,
  );

  return {
    title: emailTitle,
    body,
    tag: "monthly-summary",
    url: "/",
    html,
    previewText,
  };
}

// ---------------------------------------------------------------------------
// E2 – CSV Export Reminder — email
// ---------------------------------------------------------------------------

export async function buildCsvExportReminder(
  ctx: UserFinance,
): Promise<NotificationPayload> {
  const cycle = getCurrentCycle(ctx.settings.cycleStartDay);
  const link = `${BASE_URL}/`;
  const cycleLabel = formatCycleLabel(
    cycle.year,
    cycle.monthIndex,
    NOTIFICATION_LOCALE,
  );

  const emailTitle = L(
    `💾 Backup Data Siklus ${cycleLabel}`,
    `💾 Backup Your ${cycleLabel} Cycle Data`,
  );
  const subtitle = `${APP_NAME} · ${L(`Siklus ${cycleLabel}`, `Cycle ${cycleLabel}`)}`;
  const previewText = L(
    `Sudah backup data siklus ${cycleLabel}? Export CSV untuk arsip di Google Sheets.`,
    `Backed up your ${cycleLabel} cycle data? Export CSV to archive in Google Sheets.`,
  );
  const greeting = L("Halo! 👋", "Hello! 👋");
  const bluf = L(
    `Sudah bulan ini backup data? Export CSV pengeluaran siklus <strong>${cycleLabel}</strong> untuk arsip di Google Sheets. Data adalah aset berharga — jangan sampai hilang!`,
    `Backed up this month? Export the <strong>${cycleLabel}</strong> cycle CSV to archive in Google Sheets. Data is a valuable asset — don't lose it!`,
  );
  const ctaText = L("Export CSV Sekarang", "Export CSV Now");
  const closing = L(
    "Cadangkan data secara berkala agar histori pengeluaranmu aman. 💪",
    "Back up your data regularly to keep your spending history safe. 💪",
  );
  const signature = L(
    `Salam hangat,<br/><strong style="color:#1f2937">${APP_NAME}</strong>`,
    `Best regards,<br/><strong style="color:#1f2937">${APP_NAME}</strong>`,
  );

  const html = buildRichEmailHtml({
    themeColor: "#6366f1",
    title: emailTitle,
    subtitle,
    greeting,
    bluf,
    previewText,
    metrics: [],
    categoryHeader: "",
    categories: [],
    ctaText,
    ctaUrl: link,
    closing,
    signature,
  });

  const body = L(
    `Sudah backup data siklus ${cycleLabel}? Export CSV pengeluaran untuk arsip di Google Sheets.`,
    `Backed up your ${cycleLabel} cycle data? Export CSV to archive in Google Sheets.`,
  );

  return {
    title: emailTitle,
    body,
    tag: "csv-export-reminder",
    url: "/",
    html,
    previewText,
  };
}

// ---------------------------------------------------------------------------
// E1 – Quarterly Trend Report — email
// ---------------------------------------------------------------------------

export async function buildQuarterlyTrend(
  ctx: UserFinance,
): Promise<NotificationPayload> {
  const startDay = ctx.settings.cycleStartDay;
  const cycle = getCurrentCycle(startDay);
  const prev1 = shiftCycle(cycle, -1, startDay);
  const prev2 = shiftCycle(cycle, -2, startDay);
  const prev3 = shiftCycle(cycle, -3, startDay);

  const [t1, t2, t3] = await Promise.all([
    getCycleTransactions(ctx, prev1.startDate, prev1.endDate),
    getCycleTransactions(ctx, prev2.startDate, prev2.endDate),
    getCycleTransactions(ctx, prev3.startDate, prev3.endDate),
  ]);

  const statsList = [t1, t2, t3].map((t) => statsOf(ctx, t));
  const cycleLabels = [prev3, prev2, prev1].map((c) =>
    formatCycleLabel(c.year, c.monthIndex, NOTIFICATION_LOCALE),
  );
  const savingsValues = statsList.map((s) => s.netSavings);

  const avgSavings =
    savingsValues.reduce((a, b) => a + b, 0) / savingsValues.length;
  const trendDiff =
    savingsValues[savingsValues.length - 1] - savingsValues[0];
  const trendLabel =
    trendDiff > 0
      ? L(`naik ${formatShortIDR(trendDiff)}`, `up ${formatShortIDR(trendDiff)}`)
      : trendDiff < 0
        ? L(
            `turun ${formatShortIDR(Math.abs(trendDiff))}`,
            `down ${formatShortIDR(Math.abs(trendDiff))}`,
          )
        : L("stabil", "stable");

  const themeColor = "#8b5cf6";
  const link = `${BASE_URL}/`;

  const emailTitle = L(
    `📈 Laporan Tren Tabungan Triwulanan`,
    `📈 Quarterly Savings Trend Report`,
  );
  const subtitle = `${APP_NAME} · ${L("3 Siklus Terakhir", "Last 3 Cycles")}`;
  const previewText = L(
    `Rata-rata tabungan ${formatShortIDR(avgSavings)}/siklus. Tren: ${trendLabel}. Lihat detail lengkap.`,
    `Average savings ${formatShortIDR(avgSavings)}/cycle. Trend: ${trendLabel}. See the full report.`,
  );
  const greeting = L("Halo! 👋", "Hello! 👋");
  const bluf = L(
    `<strong>Ringkasan 3 siklus terakhir:</strong> Rata-rata sisa tabungan <strong>${formatShortIDR(avgSavings)}</strong> per siklus. Tren <strong>${trendLabel}</strong>.`,
    `<strong>Last 3 cycles summary:</strong> Average savings left <strong>${formatShortIDR(avgSavings)}</strong> per cycle. Trend is <strong>${trendLabel}</strong>.`,
  );
  const ctaText = L("Buka Dashboard", "Open Dashboard");

  const categoryHeader = L("Tabungan per Siklus", "Savings per Cycle");
  const categories = cycleLabels.map((label, i) => ({
    name: label,
    detail: L(
      `Sisa: ${formatShortIDR(savingsValues[i])} · Pengeluaran: ${formatShortIDR(statsList[i].totalSpent)}`,
      `Left: ${formatShortIDR(savingsValues[i])} · Spent: ${formatShortIDR(statsList[i].totalSpent)}`,
    ),
    dotColor: savingsValues[i] > 0 ? "#22c55e" : "#ef4444",
  }));

  const trendEmoji = trendDiff >= 0 ? "📈" : "📉";
  const closing = L(
    `${trendEmoji} Tren tabungan ${trendLabel} dibanding 3 siklus lalu. ${trendDiff >= 0 ? "Pertahankan kebiasaan baik ini!" : "Coba evaluasi pengeluaran di wadah yang paling boros."} 💪`,
    `${trendEmoji} Savings trend is ${trendLabel} vs 3 cycles ago. ${trendDiff >= 0 ? "Keep up the good habit!" : "Try reviewing spending in your biggest categories."} 💪`,
  );
  const signature = L(
    `Salam hangat,<br/><strong style="color:#1f2937">${APP_NAME}</strong>`,
    `Best regards,<br/><strong style="color:#1f2937">${APP_NAME}</strong>`,
  );

  const html = buildRichEmailHtml({
    themeColor,
    title: emailTitle,
    subtitle,
    greeting,
    bluf,
    previewText,
    metrics: [
      {
        label: L("Rata-rata Tabungan", "Avg Savings"),
        value: formatShortIDR(avgSavings),
        color: avgSavings > 0 ? "#22c55e" : "#ef4444",
      },
      {
        label: L("Tren", "Trend"),
        value: trendLabel,
        color: trendDiff >= 0 ? "#22c55e" : "#ef4444",
      },
    ],
    categoryHeader,
    categories,
    ctaText,
    ctaUrl: link,
    closing,
    signature,
  });

  const body = L(
    `📊 3 siklus terakhir: rata-rata tabungan ${formatShortIDR(avgSavings)} per siklus. Tren ke arah yang ${trendDiff >= 0 ? "benar" : "perlu diperbaiki"}!`,
    `📊 Last 3 cycles: average savings ${formatShortIDR(avgSavings)} per cycle. The trend is going ${trendDiff >= 0 ? "the right way" : "the wrong way"}!`,
  );

  return {
    title: emailTitle,
    body,
    tag: "quarterly-trend",
    url: "/",
    html,
    previewText,
  };
}

// ---------------------------------------------------------------------------
// F1 – Yearly Recap — email
// ---------------------------------------------------------------------------

export async function buildYearlyRecap(
  ctx: UserFinance,
): Promise<NotificationPayload> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const prevYear = currentYear - 1;

  const startDate = new Date(currentYear, 0, 1, 0, 0, 0, 0);
  const endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999);
  const prevStartDate = new Date(prevYear, 0, 1, 0, 0, 0, 0);
  const prevEndDate = new Date(prevYear, 11, 31, 23, 59, 59, 999);

  const [currentTx, prevTx] = await Promise.all([
    getCycleTransactions(ctx, startDate, endDate),
    getCycleTransactions(ctx, prevStartDate, prevEndDate),
  ]);

  const totalSpentCurrent = currentTx
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalSpentPrev = prevTx
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + t.amount, 0);
  const transactionCountCurrent = currentTx.length;

  // Pengeluaran per wadah (EXPENSE saja).
  const spentByEnvelope = new Map<string, number>();
  for (const t of currentTx) {
    if (t.type !== "EXPENSE") continue;
    spentByEnvelope.set(
      t.categoryId,
      (spentByEnvelope.get(t.categoryId) ?? 0) + t.amount,
    );
  }

  const allEnvelopes = ctx.categories
    .map((cat) => ({
      label: cat.name,
      color: cat.color,
      spent: spentByEnvelope.get(cat.id) ?? 0,
      allocation: cat.allocation,
    }))
    .sort((a, b) => b.spent - a.spent);

  const spentDiff = totalSpentCurrent - totalSpentPrev;
  const initial = ctx.settings.savingsInitial;
  const totalIncomeCurrent = currentTx
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + t.amount, 0);
  const estimatedSavingsFinal =
    initial * 12 + totalIncomeCurrent - totalSpentCurrent;

  const cumulativeTargetSavings =
    (initial - ctx.categories.reduce((acc, c) => acc + c.allocation, 0)) * 12;
  const cumulativeDiff = estimatedSavingsFinal - cumulativeTargetSavings;
  const cumulativeDiffLabel =
    cumulativeDiff >= 0
      ? `+${formatShortIDR(cumulativeDiff)}`
      : L(
          `−${formatShortIDR(Math.abs(cumulativeDiff))}`,
          `−${formatShortIDR(Math.abs(cumulativeDiff))}`,
        );
  const cumulativeDiffColor = cumulativeDiff >= 0 ? "#22c55e" : "#ef4444";

  const spentByMonth = new Map<number, number>();
  for (const t of currentTx) {
    if (t.type !== "EXPENSE") continue;
    const monthIdx = new Date(t.date).getMonth();
    spentByMonth.set(monthIdx, (spentByMonth.get(monthIdx) ?? 0) + t.amount);
  }
  let busiestMonthIdx = -1;
  let busiestMonthSpent = 0;
  for (const [monthIdx, spent] of spentByMonth) {
    if (spent > busiestMonthSpent) {
      busiestMonthSpent = spent;
      busiestMonthIdx = monthIdx;
    }
  }
  const busiestMonthLabel =
    busiestMonthIdx >= 0
      ? formatCycleLabel(currentYear, busiestMonthIdx, NOTIFICATION_LOCALE)
      : L("-", "-");
  const busiestMonthValue =
    busiestMonthIdx >= 0 ? `${busiestMonthLabel}` : L("Belum ada data", "No data");

  const topMonths = Array.from(spentByMonth.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([monthIdx, spent]) => ({
      name: formatCycleLabel(currentYear, monthIdx, NOTIFICATION_LOCALE),
      detail: formatShortIDR(spent),
      dotColor: "#f59e0b",
    }));

  const themeColor = "#f59e0b";
  const link = `${BASE_URL}/`;

  const emailTitle = L(
    `🎊 Rekap Akhir Tahun ${currentYear}`,
    `🎊 End-of-Year Recap ${currentYear}`,
  );
  const subtitle = `${APP_NAME} · ${currentYear}`;
  const previewText = L(
    `Rekap akhir tahun ${currentYear}: Sisa tabungan ${formatShortIDR(estimatedSavingsFinal)}, selisih target ${cumulativeDiffLabel}.${spentDiff < 0 ? ` Hemat ${formatShortIDR(Math.abs(spentDiff))} dari ${prevYear}.` : ""}${busiestMonthIdx >= 0 ? ` Bulan terbanyak: ${busiestMonthLabel}.` : ""} Lihat detail lengkap.`,
    `End of ${currentYear} recap: Savings left ${formatShortIDR(estimatedSavingsFinal)}, target diff ${cumulativeDiffLabel}.${spentDiff < 0 ? ` Saved ${formatShortIDR(Math.abs(spentDiff))} vs ${prevYear}.` : ""}${busiestMonthIdx >= 0 ? ` Top month: ${busiestMonthLabel}.` : ""} See the full report.`,
  );
  const greeting = L("Selamat tahun baru! 🎉", "Happy New Year! 🎉");
  const bluf = L(
    `<strong>Ringkasan tahun ${currentYear}:</strong> Total tabungan <strong>${formatShortIDR(estimatedSavingsFinal)}</strong>.${spentDiff < 0 ? ` Pengeluaran turun ${formatShortIDR(Math.abs(spentDiff))} dibanding ${prevYear}.` : spentDiff > 0 ? ` Pengeluaran naik ${formatShortIDR(spentDiff)} dibanding ${prevYear}.` : ` Pengeluaran sama dengan ${prevYear}.`}`,
    `<strong>${currentYear} summary:</strong> Total savings left <strong>${formatShortIDR(estimatedSavingsFinal)}</strong>.${spentDiff < 0 ? ` Spending dropped ${formatShortIDR(Math.abs(spentDiff))} vs ${prevYear}.` : spentDiff > 0 ? ` Spending rose ${formatShortIDR(spentDiff)} vs ${prevYear}.` : ` Spending is the same as ${prevYear}.`}`,
  );
  const ctaText = L("Buka Dashboard", "Open Dashboard");

  const metricsGrid = [
    [
      {
        label: L("Total Pengeluaran Tahunan", "Annual Total Spent"),
        value: formatShortIDR(totalSpentCurrent),
        color: "#1f2937",
      },
      {
        label: L("Jumlah Transaksi", "Transactions"),
        value: String(transactionCountCurrent),
        color: "#6b7280",
      },
    ],
    [
      {
        label: L("Selisih Target vs Aktual", "Target vs Actual Diff"),
        value: cumulativeDiffLabel,
        color: cumulativeDiffColor,
      },
      {
        label: L("Bulan Pengeluaran Terbanyak", "Top Spending Month"),
        value: busiestMonthValue,
        color: "#f59e0b",
      },
    ],
  ];

  const categoryHeader = L("Pengeluaran per Wadah", "Spending by Envelope");
  const categories = allEnvelopes.map((env) => ({
    name: env.label,
    detail: `${formatShortIDR(env.spent)}${env.allocation > 0 ? ` dari alokasi ${formatShortIDR(env.allocation * 12)}` : ""}`,
    dotColor: env.color,
  }));

  const closing = L(
    `🎊 Terima kasih sudah mencatat pengeluaran selama tahun ${currentYear}! Tahun depan lebih hemat lagi dan Selamat Tahun Baru! 💪`,
    `🎊 Thanks for tracking your spending throughout ${currentYear}! Save even more next year and happy new year! 💪`,
  );
  const signature = L(
    `Salam hangat,<br/><strong style="color:#1f2937">${APP_NAME}</strong>`,
    `Best regards,<br/><strong style="color:#1f2937">${APP_NAME}</strong>`,
  );

  const html = buildRichEmailHtml({
    themeColor,
    title: emailTitle,
    subtitle,
    greeting,
    bluf,
    previewText,
    metricsGrid,
    categoryHeader,
    categories,
    extraSections:
      topMonths.length > 0
        ? [
            {
              header: L(
                "Top 3 Bulan Pengeluaran Terbesar",
                "Top 3 Highest Spending Months",
              ),
              rows: topMonths,
            },
          ]
        : [],
    ctaText,
    ctaUrl: link,
    closing,
    signature,
  });

  const body = L(
    `🎊 Rekap akhir tahun ${currentYear}: Sisa tabungan ${formatShortIDR(estimatedSavingsFinal)} (${transactionCountCurrent} transaksi), selisih target ${cumulativeDiffLabel}.${busiestMonthIdx >= 0 ? ` Bulan terbanyak: ${busiestMonthLabel}.` : ""} Pengeluaran ${spentDiff < 0 ? "turun " : spentDiff > 0 ? "naik " : "sama "}${spentDiff !== 0 ? formatShortIDR(Math.abs(spentDiff)) + " " : ""}dibanding ${prevYear}.`,
    `🎊 End of ${currentYear} recap: Savings left ${formatShortIDR(estimatedSavingsFinal)} (${transactionCountCurrent} transactions), target diff ${cumulativeDiffLabel}.${busiestMonthIdx >= 0 ? ` Top month: ${busiestMonthLabel}.` : ""} Spending ${spentDiff < 0 ? "dropped " : spentDiff > 0 ? "rose " : "unchanged "}${spentDiff !== 0 ? formatShortIDR(Math.abs(spentDiff)) + " " : ""}vs ${prevYear}.`,
  );

  return {
    title: emailTitle,
    body,
    tag: "yearly-recap",
    url: "/",
    html,
    previewText,
  };
}

// ---------------------------------------------------------------------------
// Shared: Email Builder & Broadcast Helpers (per user)
// ---------------------------------------------------------------------------

/**
 * Bangun template email HTML kaya (kartu dengan header, preheader, metrik,
 * tabel wadah, CTA).
 */
function buildRichEmailHtml(params: {
  themeColor: string;
  title: string;
  subtitle: string;
  greeting: string;
  bluf: string;
  previewText?: string;
  metrics?: { label: string; value: string; color?: string }[];
  metricsGrid?: { label: string; value: string; color?: string }[][];
  categoryHeader: string;
  categories: { name: string; detail: string; dotColor: string }[];
  extraSections?: {
    header: string;
    rows: { name: string; detail: string; dotColor: string }[];
  }[];
  ctaText: string;
  ctaUrl: string;
  closing: string;
  signature: string;
}): string {
  const font =
    "'Geist','Google Sans',Roboto,Helvetica,Arial,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
  const m = params.metrics ?? [];
  const mg = params.metricsGrid;
  const preheader = params.previewText
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;max-width:0">${escapeHtml(params.previewText)}</div>`
    : "";

  const metricCell = (
    metric: { label: string; value: string; color?: string },
    isFirst: boolean,
    isLast: boolean,
  ) => `<td style="padding:8px 12px;background:#fff;border:1px solid #e5e7eb;${isFirst ? "border-radius:6px 0 0 6px;" : "border-left:none;"}${isLast ? "border-radius:0 6px 6px 0;" : ""}">
          <span style="font-family:${font};color:#6b7280;font-size:12px">${escapeHtml(metric.label)}</span><br/>
          <strong style="font-family:${font};font-size:18px;color:${metric.color || params.themeColor}">${escapeHtml(metric.value)}</strong>
        </td>`;

  const metricsRow =
    m.length > 0
      ? `<hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 20px" />
    <p style="font-family:${font};margin:0 0 8px;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">${escapeHtml(L("Metrik", "Metrics"))}</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 20px;font-size:14px">
      <tr>
        ${m.map((metric, i) => metricCell(metric, i === 0, i === m.length - 1)).join("")}
      </tr>
    </table>`
      : "";

  const metricsGridBlock =
    mg && mg.length > 0
      ? `<hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 20px" />
    <p style="font-family:${font};margin:0 0 8px;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">${escapeHtml(L("Metrik", "Metrics"))}</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 20px;font-size:14px">
      ${mg
        .map((row, rowIdx) => {
          const totalCols = mg[0].length;
          return `<tr>${row
            .map((metric, colIdx) => {
              const isFirst = colIdx === 0;
              const isLast = colIdx === totalCols - 1;
              const isTopLeft = rowIdx === 0 && isFirst;
              const isTopRight = rowIdx === 0 && isLast;
              const isBottomLeft = rowIdx === mg.length - 1 && isFirst;
              const isBottomRight = rowIdx === mg.length - 1 && isLast;
              const radius = [
                isTopLeft ? "border-radius:6px 0 0 0;" : "",
                isTopRight ? "border-radius:0 6px 0 0;" : "",
                isBottomLeft ? "border-radius:0 0 0 6px;" : "",
                isBottomRight ? "border-radius:0 0 6px 0;" : "",
              ].join("");
              const border = isFirst ? "" : "border-left:none;";
              return `<td style="padding:8px 12px;background:#fff;border:1px solid #e5e7eb;${border}${radius}">
          <span style="font-family:${font};color:#6b7280;font-size:12px">${escapeHtml(metric.label)}</span><br/>
          <strong style="font-family:${font};font-size:18px;color:${metric.color || params.themeColor}">${escapeHtml(metric.value)}</strong>
        </td>`;
            })
            .join("")}</tr>`;
        })
        .join("")}
    </table>`
      : "";
  const categoryBlock =
    params.categoryHeader && params.categories.length > 0
      ? `<p style="font-family:${font};margin:0 0 8px;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">${escapeHtml(params.categoryHeader)}</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 20px;font-size:14px">
      ${params.categories
        .map(
          (cat, i) =>
            `<tr><td style="padding:8px 0;${i < params.categories.length - 1 ? "border-bottom:1px solid #e5e7eb;" : ""}">
        <span style="display:inline-block;width:10px;height:10px;background:${cat.dotColor};border-radius:50%;margin-right:8px"></span>
        ${escapeHtml(cat.name)}<br/><span style="font-family:${font};color:#6b7280;font-size:12px">${escapeHtml(cat.detail)}</span>
      </td></tr>`,
        )
        .join("")}
    </table>`
      : "";

  const extraSectionsBlock = (params.extraSections ?? [])
    .filter((sec) => sec.header && sec.rows.length > 0)
    .map(
      (sec) =>
        `<p style="font-family:${font};margin:0 0 8px;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">${escapeHtml(sec.header)}</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 20px;font-size:14px">
      ${sec.rows
        .map(
          (row, i) =>
            `<tr><td style="padding:8px 0;${i < sec.rows.length - 1 ? "border-bottom:1px solid #e5e7eb;" : ""}">
        <span style="display:inline-block;width:10px;height:10px;background:${row.dotColor};border-radius:50%;margin-right:8px"></span>
        ${escapeHtml(row.name)}<br/><span style="font-family:${font};color:#6b7280;font-size:12px">${escapeHtml(row.detail)}</span>
      </td></tr>`,
        )
        .join("")}
    </table>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="${NOTIFICATION_LOCALE}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
<title>${escapeHtml(params.title)}</title>
<style type="text/css">
@media screen{body,table,td,p,a,span,strong,h1,h2,h3{font-family:${font}}}
.email-container{width:100%!important;max-width:560px!important}
.email-card{padding:28px 24px!important}
.email-header{padding:24px!important}
.email-title{font-size:22px!important}
.email-subtitle{font-size:13px!important}
.metric-value{font-size:18px!important}
.metric-label{font-size:12px!important}
.bluf-text{font-size:15px!important;line-height:1.6!important}
.section-header{font-size:13px!important}
.cat-name{font-size:14px!important}
.cat-detail{font-size:12px!important}
.cta-btn{padding:12px 32px!important;font-size:14px!important}
.closing-text{font-size:14px!important}
.signature-text{font-size:13px!important}
@media screen and (max-width:600px){
  body{padding:12px!important}
  .email-card{padding:20px 16px!important}
  .email-header{padding:20px 16px!important}
  .email-title{font-size:19px!important}
  .email-subtitle{font-size:12px!important}
  .bluf-text{font-size:14px!important}
  .metric-grid-table,.metric-grid-table tr,.metric-grid-table td{display:block!important;width:100%!important;box-sizing:border-box!important}
  .metric-grid-table td{border-radius:6px!important;border:1px solid #e5e7eb!important;margin-bottom:8px!important}
  .metric-grid-table tr{border:none!important}
  .metric-value{font-size:16px!important}
  .metric-label{font-size:11px!important}
  .section-header{font-size:12px!important}
  .cat-name{font-size:13px!important}
  .cat-detail{font-size:11px!important}
  .cta-btn{display:block!important;width:100%!important;padding:12px 0!important;box-sizing:border-box!important}
  .closing-text{font-size:13px!important}
  .signature-text{font-size:12px!important}
}
@media screen and (max-width:380px){
  .email-card{padding:16px 12px!important}
  .email-header{padding:16px 12px!important}
  .email-title{font-size:17px!important}
  .bluf-text{font-size:13px!important}
  .metric-value{font-size:15px!important}
}
</style>
<!--[if mso]>
<style type="text/css">body,table,td,p,a,span,strong,h1,h2,h3{font-family:Arial,sans-serif!important}</style>
<![endif]-->
</head>
<body style="margin:0;padding:24px;background:#f3f4f6;font-family:${font}">
${preheader}
<div class="email-container" style="font-family:${font};max-width:560px;margin:0 auto;color:#1f2937;padding:0">
  <div class="email-header" style="background:${params.themeColor};color:#fff;padding:24px;text-align:center;border-radius:12px 12px 0 0">
    <h1 class="email-title" style="font-family:${font};margin:0;font-size:22px;font-weight:700">${escapeHtml(params.title)}</h1>
    <p class="email-subtitle" style="font-family:${font};margin:4px 0 0;font-size:13px;opacity:0.9">${escapeHtml(params.subtitle)}</p>
  </div>
  <div class="email-card" style="background:#f9fafb;padding:28px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
    <p style="font-family:${font};margin:0 0 16px;font-size:15px">${params.greeting}</p>
    <p class="bluf-text" style="font-family:${font};margin:0 0 20px;font-size:15px;line-height:1.6">${params.bluf}</p>
    ${metricsRow}${metricsGridBlock}
    ${categoryBlock}${extraSectionsBlock}
    <div style="text-align:center;margin:24px 0 16px">
      <a class="cta-btn" href="${escapeHtml(params.ctaUrl)}" style="font-family:${font};display:inline-block;padding:12px 32px;background:${params.themeColor};color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">${escapeHtml(params.ctaText)}</a>
    </div>
    <p class="closing-text" style="font-family:${font};margin:0 0 4px;font-size:14px;line-height:1.6">${params.closing}</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0 12px" />
    <p class="signature-text" style="font-family:${font};margin:0;font-size:13px;color:#6b7280;line-height:1.5">${params.signature}</p>
  </div>
</div>
</body>
</html>`;
}

/** Bangun versi HTML sederhana dari payload notifikasi untuk email (fallback). */
function toEmailHtml(payload: NotificationPayload): string {
  const link = `${BASE_URL}${payload.url}`;
  const openLabel = L("Buka Dashboard", "Open Dashboard");
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1f2937">
  <h2 style="margin:0 0 12px">${escapeHtml(payload.title)}</h2>
  <p style="font-size:15px;line-height:1.6;margin:0 0 16px">${escapeHtml(payload.body)}</p>
  <p style="margin:0">
    <a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 18px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;font-size:14px">${openLabel}</a>
  </p>
</div>`;
}

/** Escape karakter HTML agar aman di email. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// Broadcast helpers (push & email) — per user
// ---------------------------------------------------------------------------

export interface BroadcastResult {
  /** Jumlah user yang diproses. */
  users: number;
  /** Push terkirim. */
  sent: number;
  /** Push gagal. */
  failed: number;
  /** Subscription expired yang dibersihkan. */
  cleanedUp: number;
  /** User dilewati (kondisi tidak terpenuhi). */
  skipped: number;
  /** Email terkirim. */
  emailed: number;
}

/**
 * Kirim push notification ke semua subscription milik satu user.
 * Endpoint expired (404/410) otomatis dihapus dari database.
 */
async function pushToUser(
  userId: string,
  payload: NotificationPayload,
): Promise<{ sent: number; failed: number; cleanedUp: number }> {
  const subs = await getSubscriptionsOfUser(userId);
  let sent = 0;
  let failed = 0;
  let cleanedUp = 0;

  await Promise.all(
    subs.map(async (sub) => {
      const ok = await sendPushNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys as { p256dh: string; auth: string },
        },
        payload,
      );
      if (ok) {
        sent++;
      } else {
        failed++;
        await removeStaleSubscription(sub.endpoint);
        cleanedUp++;
      }
    }),
  );

  return { sent, failed, cleanedUp };
}

/** Kirim email notifikasi ke user (bila SMTP aktif). */
async function emailToUser(
  ctx: UserFinance,
  payload: NotificationPayload,
): Promise<boolean> {
  if (!isEmailConfigured()) return false;
  return sendEmail({
    to: ctx.email,
    subject: payload.title,
    text: payload.body,
    html: payload.html ?? toEmailHtml(payload),
  });
}

/**
 * Jalankan builder notifikasi untuk SEMUA user (push channel).
 * Builder mengembalikan null = skip user tsb.
 */
export async function broadcastPushToAllUsers(
  build: (ctx: UserFinance) => Promise<NotificationPayload | null>,
): Promise<BroadcastResult> {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true },
  });

  const result: BroadcastResult = {
    users: 0,
    sent: 0,
    failed: 0,
    cleanedUp: 0,
    skipped: 0,
    emailed: 0,
  };

  for (const user of users) {
    result.users++;
    try {
      const ctx = await loadUserFinance(user);
      const payload = await build(ctx);
      if (!payload) {
        result.skipped++;
        continue;
      }
      const push = await pushToUser(user.id, payload);
      result.sent += push.sent;
      result.failed += push.failed;
      result.cleanedUp += push.cleanedUp;
    } catch (err) {
      console.error(
        `[notification] gagal kirim push utk user ${user.id}:`,
        err,
      );
      result.failed++;
    }
  }

  return result;
}

/**
 * Jalankan builder notifikasi untuk SEMUA user (email channel).
 */
export async function broadcastEmailToAllUsers(
  build: (ctx: UserFinance) => Promise<NotificationPayload>,
): Promise<BroadcastResult> {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true },
  });

  const result: BroadcastResult = {
    users: 0,
    sent: 0,
    failed: 0,
    cleanedUp: 0,
    skipped: 0,
    emailed: 0,
  };

  for (const user of users) {
    result.users++;
    try {
      const ctx = await loadUserFinance(user);
      const payload = await build(ctx);
      const emailed = await emailToUser(ctx, payload);
      if (emailed) result.emailed++;
    } catch (err) {
      console.error(
        `[notification] gagal kirim email utk user ${user.id}:`,
        err,
      );
      result.failed++;
    }
  }

  return result;
}

import { CATEGORY_MAP } from "@/models/categories";
import type { Purchase } from "@/models/types";
import {
  SAVINGS_INITIAL,
  BASE_URL,
  NOTIFICATION_LOCALE,
  META_APP,
} from "@/config/variables";
import { computeCycleStats } from "@/helpers/stats";
import { toPurchases } from "@/helpers/purchaseTransformer";
import { formatShortIDR } from "@/utils/currency";
import {
  getCurrentCycle,
  shiftCycle,
  formatDateLabel,
  formatCycleLabel,
} from "@/utils/cycleUtils";
import { getPurchasesInRange } from "@/services/budgetService";

/** Nama aplikasi untuk header/tanda tangan email (fallback bila env kosong). */
const APP_NAME = META_APP ?? "Savings Goal Tracker";

/**
 * Builder payload notifikasi (web push + email).
 *
 * Konten dilokalkan sesuai env `NOTIFICATION_LOCALE` (id | en).
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
// B1 – Tracking Nudge (Pengingat Belum Mencatat)
// Harian, jam 20:00–21:00 WIB, hanya jika belum ada transaksi hari ini.
// Channel: web push.
// ---------------------------------------------------------------------------

/** Cek apakah sebuah pembelian terjadi hari ini (lokal). */
function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/**
 * Bangun payload notifikasi B1: Tracking Nudge.
 * Hanya muncul jika belum ada transaksi tercatat hari ini.
 * Jika sudah ada transaksi, kembalikan null (skip).
 */
export async function buildTrackingNudge(): Promise<NotificationPayload | null> {
  const cycle = getCurrentCycle();
  const records = await getPurchasesInRange(cycle.startDate, cycle.endDate);
  const purchases = toPurchases(records);
  const stats = computeCycleStats(purchases);

  const todayPurchases = purchases.filter((p) => isToday(p.date));
  // Jika sudah ada pengeluaran hari ini, skip notifikasi.
  if (todayPurchases.length > 0) return null;

  const body = L(
    `Belum ada pengeluaran dicatat hari ini. Catat sekarang biar tidak lupa besok. Total siklus ${cycle.label}: ${formatShortIDR(stats.totalSpent)}.`,
    `No spending logged today. Log it now so you don't forget tomorrow. ${cycle.label} cycle total: ${formatShortIDR(stats.totalSpent)}.`,
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
// C1 – Category Spotlight (Sorotan Wadah Boros Minggu Ini)
// Mingguan, hari Jumat jam 20:00 WIB.
// Channel: web push.
// ---------------------------------------------------------------------------

/**
 * Bangun payload notifikasi C1: Category Spotlight.
 * Menampilkan kategori dengan pertumbuhan pengeluaran tertinggi dalam 7 hari terakhir.
 */
export async function buildCategorySpotlight(): Promise<NotificationPayload> {
  const cycle = getCurrentCycle();
  const records = await getPurchasesInRange(cycle.startDate, cycle.endDate);
  const purchases = toPurchases(records);

  // Ambil pembelian 7 hari terakhir
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentPurchases = purchases.filter(
    (p) => new Date(p.date) >= sevenDaysAgo,
  );

  if (recentPurchases.length === 0) {
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

  // Hitung pengeluaran per kategori dalam 7 hari terakhir
  const weekByCategory = new Map<string, number>();
  for (const p of recentPurchases) {
    weekByCategory.set(
      p.categoryId,
      (weekByCategory.get(p.categoryId) ?? 0) + p.amount,
    );
  }

  // Cari kategori dengan pengeluaran tertinggi minggu ini (hanya yang dialokasikan)
  let topCatId: string | null = null;
  let topAmount = 0;
  for (const [id, amount] of weekByCategory) {
    const cat = CATEGORY_MAP[id];
    if (cat && !cat.excludeFromAllocation && amount > topAmount) {
      topCatId = id;
      topAmount = amount;
    }
  }

  if (!topCatId) {
    return {
      title: L("📊 Sorotan Mingguan", "📊 Weekly Spotlight"),
      body: L(
        `${recentPurchases.length} transaksi minggu ini. Semua berjalan lancar!`,
        `${recentPurchases.length} transactions this week. Everything looks good!`,
      ),
      tag: "category-spotlight",
      url: "/",
      icon: PUSH_ICON,
      badge: PUSH_BADGE,
    };
  }

  const topCat = CATEGORY_MAP[topCatId]!;
  const catLabel = topCat.label[NOTIFICATION_LOCALE] ?? topCat.label.id;
  const catRemaining =
    topCat.allocation > 0
      ? Math.max(
          0,
          topCat.allocation - getSpentForCategory(purchases, topCatId),
        )
      : 0;

  return {
    title: L("📊 Alokasi Mingguan", "📊 Weekly Allocation"),
    body: L(
      `Minggu ini pengeluaran ${catLabel} naik ${formatShortIDR(topAmount)}. Alokasi tersisa ${formatShortIDR(catRemaining)} untuk sisa siklus.`,
      `${catLabel} spending rose ${formatShortIDR(topAmount)} this week. ${formatShortIDR(catRemaining)} allocation left for the rest of the cycle.`,
    ),
    tag: "category-spotlight",
    url: "/",
    icon: PUSH_ICON,
    badge: PUSH_BADGE,
  };
}

/** Helper: hitung total pengeluaran untuk satu kategori dari daftar pembelian. */
function getSpentForCategory(
  purchases: Purchase[],
  categoryId: string,
): number {
  return purchases
    .filter((p) => p.categoryId === categoryId)
    .reduce((acc, p) => acc + p.amount, 0);
}

// ---------------------------------------------------------------------------
// D1 – Cycle Reset Reminder (Pengingat Reset Siklus, H-1)
// Bulanan, H-1 sebelum siklus baru ( tanggal startDay - 1 malam).
// Channel: web push.
// ---------------------------------------------------------------------------

/**
 * Bangun payload notifikasi D1: Cycle Reset Reminder.
 * Mengingatkan pengguna bahwa siklus akan berakhir besok.
 */
export async function buildCycleResetReminder(): Promise<NotificationPayload> {
  const cycle = getCurrentCycle();
  const nextCycle = shiftCycle(cycle, 1);
  const cycleEndDate = new Date(cycle.endDate);
  // Tampilkan tanggal H-1 (hari ini, karena dijalankan malam sebelum siklus baru)
  const todayStr = formatDateLabel(new Date(), NOTIFICATION_LOCALE);
  const nextStartDateStr = formatDateLabel(
    nextCycle.startDate,
    NOTIFICATION_LOCALE,
  );

  const records = await getPurchasesInRange(cycle.startDate, cycle.endDate);
  const purchases = toPurchases(records);
  const stats = computeCycleStats(purchases);

  let body: string;
  if (stats.overLimit) {
    body = L(
      `Siklus ${cycle.label} berakhir besok! ⚠️ Pengeluaran sudah melebihi limit (${formatShortIDR(stats.allocatedSpent)} dari ${formatShortIDR(stats.spendingLimit)}). Pastikan semua pengeluaran sudah tercatat sebelum ${nextStartDateStr}.`,
      `The ${cycle.label} cycle ends tomorrow! ⚠️ Spending has exceeded the limit (${formatShortIDR(stats.allocatedSpent)} of ${formatShortIDR(stats.spendingLimit)}). Make sure everything is recorded before ${nextStartDateStr}.`,
    );
  } else {
    body = L(
      `Siklus ${cycle.label} berakhir besok (${todayStr}). Sisa limit ${formatShortIDR(stats.limitRemaining)}. Pastikan semua pengeluaran sudah tercatat sebelum ${nextStartDateStr}.`,
      `The ${cycle.label} cycle ends tomorrow (${todayStr}). ${formatShortIDR(stats.limitRemaining)} limit remaining. Make sure all spending is recorded before ${nextStartDateStr}.`,
    );
  }

  return {
    title: L(
      `⏰ Siklus ${cycle.label} Berakhir Besok!`,
      `⏰ ${cycle.label} Cycle Ends Tomorrow!`,
    ),
    body,
    tag: "cycle-reset",
    url: "/",
    icon: PUSH_ICON,
    badge: PUSH_BADGE,
  };
}

// ---------------------------------------------------------------------------
// D2 + D4 – New Cycle Kickoff + Allocation Suggestion
// Bulanan, hari pertama siklus baru (tanggal startDay).
// Channel: email (rich HTML).
// ---------------------------------------------------------------------------

/**
 * Bangun payload notifikasi D2+D4: New Cycle Kickoff + Allocation Suggestion.
 * Menampilkan saldo baru, alokasi wadah yang direset, dan saran realokasi
 * berdasarkan pola 3 siklus terakhir.
 */
export async function buildNewCycleKickoff(): Promise<NotificationPayload> {
  const cycle = getCurrentCycle();
  const startDateStr = formatDateLabel(cycle.startDate, NOTIFICATION_LOCALE);
  const link = `${BASE_URL}/`;

  // Data 3 siklus terakhir untuk analisis realokasi (D4)
  const prev1 = shiftCycle(cycle, -1);
  const prev2 = shiftCycle(cycle, -2);
  const prev3 = shiftCycle(cycle, -3);

  const [rec1, rec2, rec3] = await Promise.all([
    getPurchasesInRange(prev1.startDate, prev1.endDate),
    getPurchasesInRange(prev2.startDate, prev2.endDate),
    getPurchasesInRange(prev3.startDate, prev3.endDate),
  ]);

  const purchases1 = toPurchases(rec1);
  const purchases2 = toPurchases(rec2);
  const purchases3 = toPurchases(rec3);

  const stats1 = computeCycleStats(purchases1);
  const stats2 = computeCycleStats(purchases2);
  const stats3 = computeCycleStats(purchases3);

  // Saran realokasi: kategori yang konsisten melebihi/jauh di bawah alokasi
  const suggestions = buildAllocationSuggestions([stats1, stats2, stats3]);

  const themeColor = "#22c55e";

  const emailTitle = L(
    `🚀 Siklus Baru ${cycle.label} Dimulai!`,
    `🚀 New ${cycle.label} Cycle Begins!`,
  );
  const subtitle = `${APP_NAME} · ${L(`Mulai ${startDateStr}`, `Starts ${startDateStr}`)}`;
  const previewText = L(
    `Siklus baru ${cycle.label} dimulai! Saldo awal ${formatShortIDR(SAVINGS_INITIAL)}.${suggestions.length > 0 ? ` ${suggestions.length} saran realokasi wadah.` : ""}`,
    `New ${cycle.label} cycle starts! Initial balance ${formatShortIDR(SAVINGS_INITIAL)}.${suggestions.length > 0 ? ` ${suggestions.length} envelope allocation suggestions.` : ""}`,
  );
  const greeting = L(
    "Selamat memulai siklus baru! 🎉",
    "A fresh cycle begins! 🎉",
  );
  const bluf = L(
    `Siklus <strong>${cycle.label}</strong> resmi dimulai hari ini. Saldo awal <strong>${formatShortIDR(SAVINGS_INITIAL)}</strong> dengan wadah yang sudah direset. Semoga lebih hemat dari siklus lalu! 💪`,
    `The <strong>${cycle.label}</strong> cycle officially starts today. Initial balance: <strong>${formatShortIDR(SAVINGS_INITIAL)}</strong> with envelopes reset. Hope you save more than last cycle! 💪`,
  );
  const ctaText = L("Buka Dashboard", "Open Dashboard");

  // Tabel alokasi wadah dengan info pengeluaran rata-rata (D4)
  const categoryHeader = L(
    "Alokasi Wadah & Saran Realokasi",
    "Envelope Allocation & Suggestions",
  );
  const categories = Object.values(CATEGORY_MAP)
    .filter((c) => !c.excludeFromAllocation)
    .map((cat) => {
      // Hitung rata-rata pengeluaran kategori ini di 3 siklus terakhir
      const spentPerCycle = [stats1, stats2, stats3].map((s) => {
        const cs = s.categories.find((c) => c.categoryId === cat.id);
        return cs ? cs.spent : 0;
      });
      const validSpent = spentPerCycle.filter((v) => v > 0);
      const avgSpent =
        validSpent.length > 0
          ? Math.round(
              validSpent.reduce((a, b) => a + b, 0) / validSpent.length,
            )
          : 0;

      // Tentukan indikator saran
      let indicator = "";
      if (validSpent.length >= 2) {
        const alwaysOver =
          validSpent.filter((v) => v > cat.allocation).length >=
          validSpent.length;
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

      return {
        name: cat.label[NOTIFICATION_LOCALE] ?? cat.label.id,
        detail,
        dotColor: cat.color,
      };
    });

  // Penutup + saran realokasi
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
        value: formatShortIDR(SAVINGS_INITIAL),
        color: "#22c55e",
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
    `Siklus baru ${cycle.label} dimulai! Saldo awal ${formatShortIDR(SAVINGS_INITIAL)} dengan wadah siap diisi. Semangat menabung!${suggestions.length > 0 ? ` 💡 ${suggestions[0]}` : ""}`,
    `New ${cycle.label} cycle begins! Starting balance ${formatShortIDR(SAVINGS_INITIAL)} across fresh envelopes. Let's save!${suggestions.length > 0 ? ` 💡 ${suggestions[0]}` : ""}`,
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

/**
 * Bangun saran realokasi dari data 3 siklus terakhir.
 * Mengembalikan array string HTML (saran per kategori).
 */
function buildAllocationSuggestions(
  statsList: ReturnType<typeof computeCycleStats>[],
): string[] {
  if (statsList.length === 0) return [];

  const suggestions: string[] = [];
  const allocatedCats = Object.values(CATEGORY_MAP).filter(
    (c) => !c.excludeFromAllocation,
  );

  for (const cat of allocatedCats) {
    const spentValues = statsList
      .map((s) => {
        const cs = s.categories.find((c) => c.categoryId === cat.id);
        return cs ? cs.spent : 0;
      })
      .filter((v) => v > 0);

    if (spentValues.length < 1) continue; // Perlu minimal 1 siklus dengan data

    const avgSpent = Math.round(
      spentValues.reduce((a, b) => a + b, 0) / spentValues.length,
    );
    const alwaysOver =
      spentValues.filter((v) => v > cat.allocation).length ===
      spentValues.length;
    const alwaysUnder =
      spentValues.filter((v) => v < cat.allocation * 0.7).length ===
      spentValues.length;

    if (alwaysOver && cat.allocation > 0) {
      const catLabel = cat.label[NOTIFICATION_LOCALE] ?? cat.label.id;
      suggestions.push(
        L(
          `Naikkan ${catLabel}: rata-rata ${formatShortIDR(avgSpent)}/siklus, melebihi alokasi ${formatShortIDR(cat.allocation)}.`,
          `Increase ${catLabel}: averages ${formatShortIDR(avgSpent)}/cycle, exceeds allocation of ${formatShortIDR(cat.allocation)}.`,
        ),
      );
    } else if (alwaysUnder && cat.allocation > 0) {
      const catLabel = cat.label[NOTIFICATION_LOCALE] ?? cat.label.id;
      suggestions.push(
        L(
          `Kurangi ${catLabel}: rata-rata ${formatShortIDR(avgSpent)}/siklus dari alokasi ${formatShortIDR(cat.allocation)}. Alihkan ke wadah lain.`,
          `Reduce ${catLabel}: averages ${formatShortIDR(avgSpent)}/cycle from allocation ${formatShortIDR(cat.allocation)}. Reallocate to other envelopes.`,
        ),
      );
    }
  }

  return suggestions.slice(0, 5); // Maks 5 saran
}

// ---------------------------------------------------------------------------
// D3 – Monthly Summary (Rekap Akhir Siklus)
// Bulanan, di akhir siklus (tanggal startDay - 1 malam).
// Channel: email (rich HTML).
// ---------------------------------------------------------------------------

/**
 * Bangun payload notifikasi D3: End-of-Cycle Recap (Monthly Summary).
 * Ringkasan lengkap per siklus: total tabungan akhir, wadah paling boros,
 * dan perbandingan dengan siklus sebelumnya.
 */
export async function buildMonthlySummary(): Promise<NotificationPayload> {
  const cycle = getCurrentCycle();
  const prevCycle = shiftCycle(cycle, -1);

  const [currentRecords, prevRecords] = await Promise.all([
    getPurchasesInRange(cycle.startDate, cycle.endDate),
    getPurchasesInRange(prevCycle.startDate, prevCycle.endDate),
  ]);

  const currentPurchases = toPurchases(currentRecords);
  const prevPurchases = toPurchases(prevRecords);

  const stats = computeCycleStats(currentPurchases);
  const prevStats = computeCycleStats(prevPurchases);

  // Top 3 kategori pengeluaran terbesar di siklus ini (dialokasikan saja)
  const topCategories = stats.categories
    .filter((c) => !c.excludeFromAllocation && c.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 3);

  // Selisih pengeluaran vs siklus sebelumnya
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

  // Sisa tabungan
  const savings = stats.remaining;
  const savingsPercent =
    SAVINGS_INITIAL > 0 ? Math.round((savings / SAVINGS_INITIAL) * 100) : 0;

  // --- Komponen email kaya ---
  const themeColor = "#4f46e5";

  const previewText = L(
    `Siklus ${cycle.label} selesai. Tabungan tersisa ${formatShortIDR(savings)} (${savingsPercent}%).${diff < 0 ? ` Hemat ${formatShortIDR(Math.abs(diff))} dari siklus lalu.` : ""} Lihat rekap lengkap.`,
    `${cycle.label} cycle complete. Savings left ${formatShortIDR(savings)} (${savingsPercent}%).${diff < 0 ? ` Saved ${formatShortIDR(Math.abs(diff))} vs last cycle.` : ""} See the full recap.`,
  );

  // Warna metrik sesuai kondisi.
  const limitColor = stats.overLimit
    ? "#ef4444"
    : stats.limitPercent >= 80
      ? "#f59e0b"
      : "#22c55e";
  const savingsColor = savings > 0 ? "#22c55e" : "#ef4444";

  const emailTitle = L(
    `📊 Rekap Akhir Siklus ${cycle.label}`,
    `📊 End-of-Cycle Recap: ${cycle.label}`,
  );
  const subtitle = `${APP_NAME} · ${L(`Siklus ${cycle.label}`, `Cycle ${cycle.label}`)}`;
  const greeting = L("Halo! 👋", "Hello! 👋");
  const bluf = L(
    `<strong>Ringkasan siklus ${cycle.label}:</strong> Total pengeluaran <strong>${formatShortIDR(stats.totalSpent)}</strong> (${stats.limitPercent}% limit), sisa tabungan <strong>${formatShortIDR(savings)}</strong> (${savingsPercent}%).${stats.overLimit ? " ⚠️ Limit terlampaui!" : ""}`,
    `<strong>${cycle.label} cycle summary:</strong> Total spent <strong>${formatShortIDR(stats.totalSpent)}</strong> (${stats.limitPercent}% of limit), savings left <strong>${formatShortIDR(savings)}</strong> (${savingsPercent}%).${stats.overLimit ? " ⚠️ Limit exceeded!" : ""}`,
  );
  const categoryHeader = L("Pengeluaran per Wadah", "Spending by Envelope");
  const ctaText = L("Buka Dashboard Lengkap", "Open Full Dashboard");
  const link = `${BASE_URL}/`;

  // Insight per wadah
  const categoryInsights = stats.categories
    .filter((c) => !c.excludeFromAllocation && c.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5)
    .map((c) => ({
      name: c.label[NOTIFICATION_LOCALE] ?? c.label.id,
      detail: `${formatShortIDR(c.spent)} · ${c.percent}%`,
      dotColor: c.color,
    }));

  // Penutup sesuai kondisi
  let closing: string;
  if (stats.overLimit) {
    closing = L(
      "Pengeluaran melebihi limit wadah. Evaluasi kategori yang paling boros untuk siklus berikutnya! 💪",
      "Spending exceeded the envelope limit. Review the biggest categories for next cycle! 💪",
    );
  } else if (diff < 0) {
    closing = L(
      `Mantap! Anda hemat ${formatShortIDR(Math.abs(diff))} dibanding siklus ${prevCycle.label}. Terus pertahankan! 💪`,
      `Great job! You saved ${formatShortIDR(Math.abs(diff))} compared to the ${prevCycle.label} cycle. Keep it up! 💪`,
    );
  } else {
    closing = L(
      `Siklus ${cycle.label} selesai. Terima kasih sudah mencatat pengeluaran. Tetap konsisten menabung! 💪`,
      `${cycle.label} cycle complete. Thanks for tracking your spending. Stay consistent! 💪`,
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
    metricsGrid: [
      [
        {
          label: L("Penggunaan Limit", "Limit Usage"),
          value: `${stats.limitPercent}%`,
          color: limitColor,
        },
        {
          label: L("Total Pengeluaran", "Total Spent"),
          value: formatShortIDR(stats.totalSpent),
          color: "#1f2937",
        },
      ],
      [
        {
          label: L("Sisa Tabungan", "Savings Left"),
          value: formatShortIDR(savings),
          color: savingsColor,
        },
        {
          label: L(`vs ${prevCycle.label}`, `vs ${prevCycle.label}`),
          value: diffLabel,
          color: diff <= 0 ? "#22c55e" : "#ef4444",
        },
      ],
    ],
    categoryHeader,
    categories: categoryInsights,
    ctaText,
    ctaUrl: link,
    closing,
    signature,
  });

  // Body ringkas untuk push/email fallback
  const topCatNames = topCategories
    .map((c) => c.label[NOTIFICATION_LOCALE] ?? c.label.id)
    .join(", ");
  const body = L(
    `Siklus ${cycle.label} selesai. Total pengeluaran ${formatShortIDR(stats.totalSpent)}, tabungan tersisa ${formatShortIDR(savings)} (${savingsPercent}%).${topCatNames ? ` Wadah terboros: ${topCatNames}.` : ""} vs ${prevCycle.label}: ${diffLabel}.`,
    `${cycle.label} cycle complete. Total spent ${formatShortIDR(stats.totalSpent)}, savings left ${formatShortIDR(savings)} (${savingsPercent}%).${topCatNames ? ` Top spending: ${topCatNames}.` : ""} vs ${prevCycle.label}: ${diffLabel}.`,
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
// E2 – CSV Export Reminder (Pengingat Backup Data)
// Bulanan, bersamaan dengan akhir siklus / pertengahan siklus.
// Channel: email.
// ---------------------------------------------------------------------------

/**
 * Bangun payload notifikasi E2: CSV Export Reminder.
 * Mengingatkan pengguna untuk backup data transaksi.
 */
export async function buildCsvExportReminder(): Promise<NotificationPayload> {
  const cycle = getCurrentCycle();
  const link = `${BASE_URL}/`;

  const emailTitle = L(
    `💾 Backup Data Siklus ${cycle.label}`,
    `💾 Backup Your ${cycle.label} Cycle Data`,
  );
  const subtitle = `${APP_NAME} · ${L(`Siklus ${cycle.label}`, `Cycle ${cycle.label}`)}`;
  const previewText = L(
    `Sudah backup data siklus ${cycle.label}? Export CSV untuk arsip di Google Sheets.`,
    `Backed up your ${cycle.label} cycle data? Export CSV to archive in Google Sheets.`,
  );
  const greeting = L("Halo! 👋", "Hello! 👋");
  const bluf = L(
    `Sudah bulan ini backup data? Export CSV pengeluaran siklus <strong>${cycle.label}</strong> untuk arsip di Google Sheets. Data adalah aset berharga — jangan sampai hilang!`,
    `Backed up this month? Export the <strong>${cycle.label}</strong> cycle CSV to archive in Google Sheets. Data is a valuable asset — don't lose it!`,
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
    `Sudah backup data siklus ${cycle.label}? Export CSV pengeluaran untuk arsip di Google Sheets.`,
    `Backed up your ${cycle.label} cycle data? Export CSV to archive in Google Sheets.`,
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
// E1 – Quarterly Trend Report (Laporan Tren Tabungan Triwulanan)
// Triwulanan (setiap 3 siklus selesai).
// Channel: email.
// ---------------------------------------------------------------------------

/**
 * Bangun payload notifikasi E1: Quarterly Trend Report.
 * Menampilkan tren tabungan 3 siklus terakhir.
 * Menggunakan 3 siklus SEBELUM siklus saat ini (siklus yang baru saja berakhir).
 * Siklus tanpa data menampilkan 0 untuk sisa tabungan dan pengeluaran.
 * Selalu mengembalikan payload (tidak pernah null) karena dijadwalkan
 * hanya pada bulan triwulanan (Des, Mar, Jun, Sep).
 */
export async function buildQuarterlyTrend(): Promise<NotificationPayload> {
  const cycle = getCurrentCycle();
  // Ambil 3 siklus sebelum siklus saat ini (siklus yang sudah selesai)
  const prev1 = shiftCycle(cycle, -1);
  const prev2 = shiftCycle(cycle, -2);
  const prev3 = shiftCycle(cycle, -3);

  const [rec1, rec2, rec3] = await Promise.all([
    getPurchasesInRange(prev1.startDate, prev1.endDate),
    getPurchasesInRange(prev2.startDate, prev2.endDate),
    getPurchasesInRange(prev3.startDate, prev3.endDate),
  ]);

  const purchases1 = toPurchases(rec1);
  const purchases2 = toPurchases(rec2);
  const purchases3 = toPurchases(rec3);

  const stats1 = computeCycleStats(purchases1);
  const stats2 = computeCycleStats(purchases2);
  const stats3 = computeCycleStats(purchases3);

  const allCycles = [stats3, stats2, stats1];
  const cycleLabels = [prev3.label, prev2.label, prev1.label];
  const savingsValues = allCycles.map((s) => s.remaining);

  // Hitung tren
  const avgSavings =
    savingsValues.reduce((a, b) => a + b, 0) / savingsValues.length;
  const oldestSavings = savingsValues[0];
  const newestSavings = savingsValues[savingsValues.length - 1];
  const trendDiff = newestSavings - oldestSavings;
  const trendLabel =
    trendDiff > 0
      ? L(
          `naik ${formatShortIDR(trendDiff)}`,
          `up ${formatShortIDR(trendDiff)}`,
        )
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

  // Tabel per siklus
  const categoryHeader = L("Tabungan per Siklus", "Savings per Cycle");
  const categories = cycleLabels.map((label, i) => ({
    name: label,
    detail: L(
      `Sisa: ${formatShortIDR(savingsValues[i])} · Pengeluaran: ${formatShortIDR(allCycles[i].totalSpent)}`,
      `Left: ${formatShortIDR(savingsValues[i])} · Spent: ${formatShortIDR(allCycles[i].totalSpent)}`,
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
// F1 – Yearly Recap (Rekap Akhir Tahunan)
// Tahunan, tanggal 31 Desember jam 23:59 WIB.
// Channel: email (rich HTML).
// ---------------------------------------------------------------------------

/**
 * Bangun payload notifikasi F1: Yearly Recap.
 * Menampilkan laporan tren tahunan, rekap akhir tahunan, dan top 3 wadah
 * pengeluaran terbesar selama 1 tahun (1 Jan s/d 31 Des).
 */
export async function buildYearlyRecap(): Promise<NotificationPayload> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const prevYear = currentYear - 1;

  // Rentang tahunan: 1 Jan - 31 Des (masa depan jam 23:59 WIB)
  const startDate = new Date(currentYear, 0, 1, 0, 0, 0, 0);
  const endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999);

  const prevStartDate = new Date(prevYear, 0, 1, 0, 0, 0, 0);
  const prevEndDate = new Date(prevYear, 11, 31, 23, 59, 59, 999);

  const [recCurrent, recPrev] = await Promise.all([
    getPurchasesInRange(startDate, endDate),
    getPurchasesInRange(prevStartDate, prevEndDate),
  ]);

  const purchasesCurrent = toPurchases(recCurrent);
  const purchasesPrev = toPurchases(recPrev);

  // Hitung statistik sederhana untuk seluruh tahun
  const totalSpentCurrent = purchasesCurrent.reduce((sum, p) => sum + p.amount, 0);
  const totalSpentPrev = purchasesPrev.reduce((sum, p) => sum + p.amount, 0);
  const transactionCountCurrent = purchasesCurrent.length;
  const transactionCountPrev = purchasesPrev.length;

  // Hitung pengeluaran per wadah (hanya dialokasikan)
  const spentByEnvelope = new Map<string, number>();
  const allocatedCats = Object.values(CATEGORY_MAP).filter((c) => !c.excludeFromAllocation);
  for (const p of purchasesCurrent) {
    if (!spentByEnvelope.has(p.categoryId)) spentByEnvelope.set(p.categoryId, 0);
    spentByEnvelope.set(p.categoryId, spentByEnvelope.get(p.categoryId)! + p.amount);
  }

  // Top 3 wadah terboros tahun ini
  const topEnvelopes = allocatedCats
    .map((cat) => ({
      id: cat.id,
      label: cat.label[NOTIFICATION_LOCALE] ?? cat.label.id,
      color: cat.color,
      spent: spentByEnvelope.get(cat.id) ?? 0,
      allocation: cat.allocation,
    }))
    .filter((e) => e.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 3);

  // Hitung tren pengeluaran (tahun ini vs tahun lalu)
  const spentDiff = totalSpentCurrent - totalSpentPrev;
  const spentDiffLabel =
    spentDiff > 0
      ? `+${formatShortIDR(spentDiff)}`
      : spentDiff < 0
        ? L(
            `hemat ${formatShortIDR(Math.abs(spentDiff))}`,
            `saved ${formatShortIDR(Math.abs(spentDiff))}`,
          )
        : L("sama", "same");
  const spentTrendColor = spentDiff <= 0 ? "#22c55e" : "#ef4444";

  // Perkiraan tabungan (karena siklus tidak selalu sama, pakai estimasi kasar)
  // Estimasi: SAVINGS_INITIAL * 12 - totalSpentCurrent (asumsi 12 siklus)
  const estimatedSavings = SAVINGS_INITIAL * 12 - totalSpentCurrent;
  const savingsColor = estimatedSavings > 0 ? "#22c55e" : "#ef4444";

  const themeColor = "#f59e0b";
  const link = `${BASE_URL}/`;

  const emailTitle = L(
    `🎊 Rekap Akhir Tahun ${currentYear}`,
    `🎊 End-of-Year Recap ${currentYear}`,
  );
  const subtitle = `${APP_NAME} · ${currentYear}`;
  const previewText = L(
    `Rekap akhir tahun ${currentYear}: ${formatShortIDR(totalSpentCurrent)} pengeluaran tahunan. Top wadah: ${topEnvelopes.map((e) => e.label).join(", ")}. Lihat detail lengkap.`,
    `End of ${currentYear} recap: ${formatShortIDR(totalSpentCurrent)} annual spending. Top envelopes: ${topEnvelopes.map((e) => e.label).join(", ")}. See the full report.`,
  );
  const greeting = L("Selamat tahun baru! 🎉", "Happy New Year! 🎉");
  const bluf = L(
    `<strong>Ringkasan tahun ${currentYear}:</strong> ${transactionCountCurrent} transaksi tercatat dengan total pengeluaran <strong>${formatShortIDR(totalSpentCurrent)}</strong>.${spentDiff < 0 ? ` Anda hemat ${formatShortIDR(Math.abs(spentDiff))} dibanding ${prevYear}.` : spentDiff > 0 ? ` Pengeluaran naik ${formatShortIDR(spentDiff)} dibanding ${prevYear}.` : ""}`,
    `<strong>${currentYear} summary:</strong> ${transactionCountCurrent} transactions logged with total spending of <strong>${formatShortIDR(totalSpentCurrent)}</strong>.${spentDiff < 0 ? ` You saved ${formatShortIDR(Math.abs(spentDiff))} vs ${prevYear}.` : spentDiff > 0 ? ` Spending rose ${formatShortIDR(spentDiff)} vs ${prevYear}.` : ""}`,
  );
  const ctaText = L("Buka Dashboard", "Open Dashboard");

  // Metrik grid 2x2
  const metricsGrid = [
    [
      {
        label: L("Total Pengeluaran Tahunan", "Annual Total Spent"),
        value: formatShortIDR(totalSpentCurrent),
        color: "#1f2937",
      },
      {
        label: L("Estimasi Tabungan", "Est. Savings"),
        value: formatShortIDR(estimatedSavings),
        color: savingsColor,
      },
    ],
    [
      {
        label: L(`vs Tahun ${prevYear}`, `vs ${prevYear}`),
        value: spentDiffLabel,
        color: spentTrendColor,
      },
      {
        label: L("Jumlah Transaksi", "Transactions"),
        value: String(transactionCountCurrent),
        color: "#6b7280",
      },
    ],
  ];

  // Tabel top 3 wadah terboros
  const categoryHeader = L("Top 3 Wadah Tahunan", "Top 3 Annual Envelopes");
  const categories = topEnvelopes.map((env, i) => ({
    name: `${i + 1}. ${env.label}`,
    detail: `${formatShortIDR(env.spent)}${env.allocation > 0 ? ` dari alokasi ${formatShortIDR(env.allocation)}` : ""}`,
    dotColor: env.color,
  }));

  const closing = L(
    `🎊 Terima kasih sudah mencatat pengeluaran selama tahun ${currentYear}! ${topEnvelopes.length > 0 ? `Wadah terboros: ${topEnvelopes.map((e) => e.label).join(", ")}. ` : ""}Tahun depan lebih hemat lagi! 💪`,
    `🎊 Thanks for tracking your spending throughout ${currentYear}! ${topEnvelopes.length > 0 ? `Top spending envelopes: ${topEnvelopes.map((e) => e.label).join(", ")}. ` : ""}Save even more next year! 💪`,
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
    ctaText,
    ctaUrl: link,
    closing,
    signature,
  });

  const body = L(
    `🎊 Rekap akhir tahun ${currentYear}: ${formatShortIDR(totalSpentCurrent)} pengeluaran tahunan (${transactionCountCurrent} transaksi).${topEnvelopes.length > 0 ? ` Top wadah: ${topEnvelopes.map((e) => e.label).join(", ")}.` : ""} vs ${prevYear}: ${spentDiffLabel}.`,
    `🎊 End of ${currentYear} recap: ${formatShortIDR(totalSpentCurrent)} annual spending (${transactionCountCurrent} transactions).${topEnvelopes.length > 0 ? ` Top envelopes: ${topEnvelopes.map((e) => e.label).join(", ")}.` : ""} vs ${prevYear}: ${spentDiffLabel}.`,
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
// Shared: Email Builder & Broadcast Helpers
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

  // Build a single metric cell HTML
  const metricCell = (
    metric: { label: string; value: string; color?: string },
    isFirst: boolean,
    isLast: boolean,
  ) => `<td style="padding:8px 12px;background:#fff;border:1px solid #e5e7eb;${isFirst ? "border-radius:6px 0 0 6px;" : "border-left:none;"}${isLast ? "border-radius:0 6px 6px 0;" : ""}">
          <span style="font-family:${font};color:#6b7280;font-size:12px">${escapeHtml(metric.label)}</span><br/>
          <strong style="font-family:${font};font-size:18px;color:${metric.color || params.themeColor}">${escapeHtml(metric.value)}</strong>
        </td>`;

  // Inline row metrics (1xN)
  const metricsRow =
    m.length > 0
      ? `<hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 20px" />
    <p style="font-family:${font};margin:0 0 8px;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">${escapeHtml(L("Metrik", "Metrics"))}</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 20px;font-size:14px">
      <tr>
        ${m
          .map((metric, i) => metricCell(metric, i === 0, i === m.length - 1))
          .join("")}
      </tr>
    </table>`
      : "";

  // Grid metrics (2x2)
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
          (
            cat,
            i,
          ) => `<tr><td style="padding:8px 0;${i < params.categories.length - 1 ? "border-bottom:1px solid #e5e7eb;" : ""}">
        <span style="display:inline-block;width:10px;height:10px;background:${cat.dotColor};border-radius:50%;margin-right:8px"></span>
        ${escapeHtml(cat.name)}<br/><span style="font-family:${font};color:#6b7280;font-size:12px">${escapeHtml(cat.detail)}</span>
      </td></tr>`,
        )
        .join("")}
    </table>`
      : "";

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
</style>
<!--[if mso]>
<style type="text/css">body,table,td,p,a,span,strong,h1,h2,h3{font-family:Arial,sans-serif!important}</style>
<![endif]-->
</head>
<body style="margin:0;padding:24px;background:#f3f4f6;font-family:${font}">
${preheader}
<div style="font-family:${font};max-width:560px;margin:0 auto;color:#1f2937;padding:0">
  <div style="background:${params.themeColor};color:#fff;padding:24px;text-align:center;border-radius:12px 12px 0 0">
    <h1 style="font-family:${font};margin:0;font-size:22px;font-weight:700">${escapeHtml(params.title)}</h1>
    <p style="font-family:${font};margin:4px 0 0;font-size:13px;opacity:0.9">${escapeHtml(params.subtitle)}</p>
  </div>
  <div style="background:#f9fafb;padding:28px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
    <p style="font-family:${font};margin:0 0 16px;font-size:15px">${params.greeting}</p>
    <p style="font-family:${font};margin:0 0 20px;font-size:15px;line-height:1.6">${params.bluf}</p>
    ${metricsRow}${metricsGridBlock}
    ${categoryBlock}
    <div style="text-align:center;margin:24px 0 16px">
      <a href="${escapeHtml(params.ctaUrl)}" style="font-family:${font};display:inline-block;padding:12px 32px;background:${params.themeColor};color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">${escapeHtml(params.ctaText)}</a>
    </div>
    <p style="font-family:${font};margin:0 0 4px;font-size:14px;line-height:1.6">${params.closing}</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0 12px" />
    <p style="font-family:${font};margin:0;font-size:13px;color:#6b7280;line-height:1.5">${params.signature}</p>
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
// Broadcast helpers (push & email)
// ---------------------------------------------------------------------------

export interface PushSendResult {
  sent: number;
  failed: number;
  cleanedUp: number;
}

export interface EmailSendResult {
  emailed: boolean;
}

/**
 * Kirim notifikasi push ke semua subscriber.
 * Endpoint yang sudah expired (404/410) otomatis dihapus dari database.
 */
export async function broadcastPushNotification(
  payload: NotificationPayload,
): Promise<PushSendResult> {
  const { getAllSubscriptions, removeStaleSubscription } =
    await import("@/services/pushService");
  const { sendPushNotification } = await import("@/server/webPush");

  const subs = await getAllSubscriptions();
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

/**
 * Kirim email notifikasi ke penerima yang dikonfigurasi (bila SMTP aktif).
 */
export async function broadcastEmailNotification(
  payload: NotificationPayload,
): Promise<EmailSendResult> {
  const { sendEmail, isEmailConfigured } = await import("@/server/email");

  let emailed = false;
  if (isEmailConfigured()) {
    emailed = await sendEmail({
      subject: payload.title,
      text: payload.body,
      html: payload.html ?? toEmailHtml(payload),
    });
  }

  return { emailed };
}

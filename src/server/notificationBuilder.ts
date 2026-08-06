import { CATEGORY_MAP } from "@/models/categories";
import type { Purchase } from "@/models/types";
import {
  SAVINGS_INITIAL,
  BASE_URL,
  NOTIFICATION_LOCALE,
} from "@/config/variables";
import { computeCycleStats } from "@/helpers/stats";
import { toPurchases } from "@/helpers/purchaseTransformer";
import { formatShortIDR } from "@/utils/currency";
import {
  getCurrentCycle,
  shiftCycle,
} from "@/utils/cycleUtils";
import { getPurchasesInRange } from "@/services/budgetService";

/**
 * Builder payload notifikasi (web push + email).
 *
 * Konten dilokalkan sesuai env `NOTIFICATION_LOCALE` (id | en).
 * Channel email (Nodemailer SMTP) dikirim otomatis saat terkonfigurasi,
 * sebagai pelengkap web push.
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
}

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
 * Bangun payload notifikasi harian: pengingat catat pengeluaran + insight siklus.
 * Mengambil data siklus saat ini dan menampilkan progres pengeluaran vs limit.
 */
export async function buildDailyNotification(): Promise<NotificationPayload> {
  const cycle = getCurrentCycle();
  const records = await getPurchasesInRange(cycle.startDate, cycle.endDate);
  const purchases = toPurchases(records);
  const stats = computeCycleStats(purchases);

  const todayPurchases = purchases.filter((p) => isToday(p.date));
  const todaySpent = todayPurchases.reduce((acc, p) => acc + p.amount, 0);

  let body: string;

  if (stats.overLimit) {
    // Sudah melebihi limit pengeluaran
    body = L(
      `Limit siklus ${cycle.label} terlampaui! Terpakai ${stats.limitPercent}% (${formatShortIDR(stats.allocatedSpent)} dari ${formatShortIDR(stats.spendingLimit)}).`,
      `${cycle.label} cycle limit exceeded! Used ${stats.limitPercent}% (${formatShortIDR(stats.allocatedSpent)} of ${formatShortIDR(stats.spendingLimit)}).`,
    );
  } else if (stats.limitPercent >= 80) {
    // Mendekati limit (>= 80%)
    const tail =
      todayPurchases.length > 0
        ? L(
            `Hari ini: ${formatShortIDR(todaySpent)}.`,
            `Today: ${formatShortIDR(todaySpent)}.`,
          )
        : L(
            "Belum ada pengeluaran hari ini.",
            "No spending recorded today.",
          );
    body = L(
      `Hati-hati, pengeluaran ${stats.limitPercent}% dari limit. Sisa ${formatShortIDR(stats.limitRemaining)}. ${tail}`,
      `Careful, spending at ${stats.limitPercent}% of limit. ${formatShortIDR(stats.limitRemaining)} left. ${tail}`,
    );
  } else if (todayPurchases.length > 0) {
    // Ada pengeluaran hari ini
    const topCat = getTopCategory(todayPurchases);
    body = L(
      `Hari ini belanja ${formatShortIDR(todaySpent)}${topCat ? ` (${topCat})` : ""}. Total siklus: ${formatShortIDR(stats.totalSpent)}, sisa limit ${formatShortIDR(stats.limitRemaining)}.`,
      `Spent ${formatShortIDR(todaySpent)} today${topCat ? ` (${topCat})` : ""}. Cycle total: ${formatShortIDR(stats.totalSpent)}, ${formatShortIDR(stats.limitRemaining)} limit left.`,
    );
  } else {
    // Belum ada pengeluaran hari ini
    body = L(
      `Belum ada pengeluaran tercatat hari ini. Total siklus ${cycle.label}: ${formatShortIDR(stats.totalSpent)} dari ${formatShortIDR(stats.spendingLimit)}.`,
      `No spending recorded today. ${cycle.label} cycle total: ${formatShortIDR(stats.totalSpent)} of ${formatShortIDR(stats.spendingLimit)}.`,
    );
  }

  return {
    title: L(
      `Pengingat Tabungan - ${cycle.label}`,
      `Savings Reminder - ${cycle.label}`,
    ),
    body,
    tag: "daily-reminder",
    url: "/",
  };
}

/**
 * Bangun payload notifikasi mingguan: ringkasan statistik siklus + insight.
 * Menampilkan progres tabungan, kategori pengeluaran terbesar, dan perbandingan
 * dengan siklus sebelumnya.
 */
export async function buildWeeklyNotification(): Promise<NotificationPayload> {
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

  // Top 3 kategori pengeluaran terbesar di siklus ini
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
    SAVINGS_INITIAL > 0
      ? Math.round((savings / SAVINGS_INITIAL) * 100)
      : 0;

  let body = L(
    `Siklus ${cycle.label}: ${formatShortIDR(stats.totalSpent)} terpakai (${stats.limitPercent}% limit), sisa tabungan ${formatShortIDR(savings)} (${savingsPercent}%).`,
    `${cycle.label} cycle: ${formatShortIDR(stats.totalSpent)} used (${stats.limitPercent}% of limit), savings left ${formatShortIDR(savings)} (${savingsPercent}%).`,
  );

  if (topCategories.length > 0) {
    body += L(
      ` Terbesar: ${topCategories.map((c) => c.label.id).join(", ")}.`,
      ` Top: ${topCategories.map((c) => c.label.en).join(", ")}.`,
    );
  }

  body += L(` vs ${prevCycle.label}: `, ` vs ${prevCycle.label}: `) + diffLabel + ".";

  if (stats.overLimit) {
    body += L(
      " Perhatian: sudah melebihi limit!",
      " Warning: limit exceeded!",
    );
  }

  return {
    title: L(
      "Ringkasan Tabungan Mingguan",
      "Weekly Savings Summary",
    ),
    body,
    tag: "weekly-summary",
    url: "/",
  };
}

/** Ambil nama kategori dengan pengeluaran terbesar dari daftar pembelian. */
function getTopCategory(purchases: Purchase[]): string | null {
  const byCategory = new Map<string, number>();
  for (const p of purchases) {
    byCategory.set(p.categoryId, (byCategory.get(p.categoryId) ?? 0) + p.amount);
  }
  let topId: string | null = null;
  let topAmount = 0;
  for (const [id, amount] of byCategory) {
    if (amount > topAmount) {
      topId = id;
      topAmount = amount;
    }
  }
  if (!topId) return null;
  const label = CATEGORY_MAP[topId]?.label[NOTIFICATION_LOCALE];
  return label ?? topId;
}

/** Bangun versi HTML sederhana dari payload notifikasi untuk email. */
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
 * Digunakan oleh daily-reminder (hanya notifikasi push).
 */
export async function broadcastPushNotification(
  payload: NotificationPayload,
): Promise<PushSendResult> {
  const { getAllSubscriptions, removeStaleSubscription } = await import(
    "@/services/pushService"
  );
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
        // Endpoint tidak valid lagi -> hapus
        await removeStaleSubscription(sub.endpoint);
        cleanedUp++;
      }
    }),
  );

  return { sent, failed, cleanedUp };
}

/**
 * Kirim email notifikasi ke penerima yang dikonfigurasi (bila SMTP aktif).
 * Digunakan oleh weekly-summary (hanya email).
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
      html: toEmailHtml(payload),
    });
  }

  return { emailed };
}

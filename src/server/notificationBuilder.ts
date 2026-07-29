import { CATEGORY_MAP } from "@/models/categories";
import type { Purchase } from "@/models/types";
import { SAVINGS_INITIAL } from "@/config/variables";
import { computeCycleStats } from "@/helpers/stats";
import { toPurchases } from "@/helpers/purchaseTransformer";
import { formatShortIDR } from "@/utils/currency";
import {
  getCurrentCycle,
  shiftCycle,
} from "@/utils/cycleUtils";
import { getPurchasesInRange } from "@/services/budgetService";

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
export async function buildDailyNotification(): Promise<{
  title: string;
  body: string;
  tag: string;
  url: string;
}> {
  const cycle = getCurrentCycle();
  const records = await getPurchasesInRange(cycle.startDate, cycle.endDate);
  const purchases = toPurchases(records);
  const stats = computeCycleStats(purchases);

  const todayPurchases = purchases.filter((p) => isToday(p.date));
  const todaySpent = todayPurchases.reduce((acc, p) => acc + p.amount, 0);

  let body: string;

  if (stats.overLimit) {
    // Sudah melebihi limit pengeluaran
    body = `Limit siklus ${cycle.label} terlampaui! Terpakai ${stats.limitPercent}% (${formatShortIDR(stats.allocatedSpent)} dari ${formatShortIDR(stats.spendingLimit)}).`;
  } else if (stats.limitPercent >= 80) {
    // Mendekati limit (>= 80%)
    body = `Hati-hati, pengeluaran ${stats.limitPercent}% dari limit. Sisa ${formatShortIDR(stats.limitRemaining)}. ${todayPurchases.length > 0 ? `Hari ini: ${formatShortIDR(todaySpent)}.` : "Belum ada pengeluaran hari ini."}`;
  } else if (todayPurchases.length > 0) {
    // Ada pengeluaran hari ini
    const topCat = getTopCategory(todayPurchases);
    body = `Hari ini belanja ${formatShortIDR(todaySpent)}${topCat ? ` (${topCat})` : ""}. Total siklus: ${formatShortIDR(stats.totalSpent)}, sisa limit ${formatShortIDR(stats.limitRemaining)}.`;
  } else {
    // Belum ada pengeluaran hari ini
    body = `Belum ada pengeluaran tercatat hari ini. Total siklus ${cycle.label}: ${formatShortIDR(stats.totalSpent)} dari ${formatShortIDR(stats.spendingLimit)}.`;
  }

  return {
    title: `Pengingat Tabungan - ${cycle.label}`,
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
export async function buildWeeklyNotification(): Promise<{
  title: string;
  body: string;
  tag: string;
  url: string;
}> {
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
        ? `hemat ${formatShortIDR(Math.abs(diff))}`
        : "sama";

  // Sisa tabungan
  const savings = stats.remaining;
  const savingsPercent =
    SAVINGS_INITIAL > 0
      ? Math.round((savings / SAVINGS_INITIAL) * 100)
      : 0;

  let body = `Siklus ${cycle.label}: ${formatShortIDR(stats.totalSpent)} terpakai (${stats.limitPercent}% limit), sisa tabungan ${formatShortIDR(savings)} (${savingsPercent}%).`;

  if (topCategories.length > 0) {
    body += ` Terbesar: ${topCategories.map((c) => c.label).join(", ")}.`;
  }

  body += ` vs ${prevCycle.label}: ${diffLabel}.`;

  if (stats.overLimit) {
    body += " Perhatian: sudah melebihi limit!";
  }

  return {
    title: "Ringkasan Tabungan Mingguan",
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
  return CATEGORY_MAP[topId]?.label ?? topId;
}

interface SendResult {
  sent: number;
  failed: number;
  cleanedUp: number;
}

/**
 * Kirim notifikasi ke semua subscriber.
 * Menghapus subscription yang sudah expired (404/410).
 */
export async function broadcastNotification(payload: {
  title: string;
  body: string;
  tag: string;
  url: string;
}): Promise<SendResult> {
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

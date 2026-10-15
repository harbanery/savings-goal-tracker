import { Suspense } from "react";
import DashboardView from "@/features/home/components/ui/DashboardView";
import type { AllTimeTotals } from "@/features/home/components/ui/StatsCards";
import {
  getCycleTransactionsAction,
  getHistoricalTransactionsAction,
} from "@/utils/server/actions";
import type {
  BudgetCategory,
  Transaction,
  UserSettings,
} from "@/features/web/types";
import {
  getAllTimeTotals,
  getUserCategories,
  getUserSettings,
} from "@/services/transaction";
import { getCurrentUser } from "@/lib/auth";
import { ensureUserDefaults } from "@/services/user";
import { getCurrentCycle } from "@/features/web/utils/cycle";
import SectionSkeleton from "@/features/web/components/ui/sectionSkeleton";

/**
 * Feature module dashboard: kartu keuntungan seluruh waktu + kartu mini
 * siklus aktif + pengeluaran harian + grafik historis (donut saldo, pie
 * kategori, bar alokasi bulanan, perbandingan & kumulatif tabungan).
 *
 * A3 (rekomendasi_feature.md): shell HTML (guard sesi + tombol) dikirim
 * langsung; tiga query lambat (transaksi siklus, historis 6 siklus, total
 * seluruh waktu) dijalankan sebagai promise TANPA await dan di-stream
 * per-slice lewat `<Suspense>` di DashboardView.
 */
export default async function DashboardSection() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <Suspense fallback={<SectionSkeleton variant="stats" />}>
      <DashboardData userId={user.id} />
    </Suspense>
  );
}

/** Ambil data cepat (kategori + pengaturan) lalu salurkan promise lambat. */
async function DashboardData({ userId }: { userId: string }) {
  await ensureUserDefaults(userId);

  const [categories, settings]: [BudgetCategory[], UserSettings] =
    await Promise.all([getUserCategories(userId), getUserSettings(userId)]);

  const cycle = getCurrentCycle(settings.cycleStartDay);

  // Promise sengaja tidak di-await agar tiap slice bisa suspend sendiri;
  // selalu resolve (fallback kosong) agar `use()` di client tidak throw.
  const transactionsPromise: Promise<Transaction[]> =
    getCycleTransactionsAction(cycle).catch((err) => {
      console.error("[DashboardSection] gagal memuat transaksi siklus:", err);
      return [];
    });
  const allTimePromise: Promise<AllTimeTotals> = getAllTimeTotals(
    userId,
  ).catch((err) => {
    console.error("[DashboardSection] gagal memuat total seluruh waktu:", err);
    return { income: 0, spent: 0 };
  });
  const historicalPromise: Promise<Record<string, Transaction[]>> =
    getHistoricalTransactionsAction(cycle, 6).catch((err) => {
      console.error("[DashboardSection] gagal memuat transaksi historis:", err);
      return {} as Record<string, Transaction[]>;
    });

  return (
    <DashboardView
      transactionsPromise={transactionsPromise}
      allTimePromise={allTimePromise}
      historicalPromise={historicalPromise}
      categories={categories}
      settings={settings}
    />
  );
}

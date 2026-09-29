import DashboardView from "@/features/web/components/ui/DashboardView";
import {
  getCycleTransactionsAction,
  getHistoricalTransactionsAction,
} from "@/utils/server/actions";
import type {
  BudgetCategory,
  Transaction,
  UserSettings,
} from "@/features/web/types";
import { getUserCategories, getUserSettings } from "@/services/transaction";
import { getCurrentUser } from "@/lib/auth";
import { ensureUserDefaults } from "@/services/user";
import { getCurrentCycle } from "@/features/web/utils/cycle";

/**
 * Feature module dashboard (generate_web.md): kartu Saldo/Pemasukan/
 * Pengeluaran/Cash Flow + pengeluaran harian + grafik historis
 * (donut saldo, pie kategori, bar alokasi bulanan, perbandingan &
 * kumulatif tabungan).
 */
export default async function DashboardSection() {
  const user = await getCurrentUser();
  if (!user) return null;
  await ensureUserDefaults(user.id);

  const [categories, settings]: [BudgetCategory[], UserSettings] =
    await Promise.all([
      getUserCategories(user.id),
      getUserSettings(user.id),
    ]);

  const cycle = getCurrentCycle(settings.cycleStartDay);
  let initialTransactions: Transaction[] = [];
  let initialHistorical: Record<string, Transaction[]> = {};

  try {
    [initialTransactions, initialHistorical] = await Promise.all([
      getCycleTransactionsAction(cycle),
      getHistoricalTransactionsAction(cycle, 6),
    ]);
  } catch (err) {
    console.error("[DashboardSection] gagal memuat data awal:", err);
  }

  return (
    <DashboardView
      initialTransactions={initialTransactions}
      initialHistorical={initialHistorical}
      categories={categories}
      settings={settings}
    />
  );
}

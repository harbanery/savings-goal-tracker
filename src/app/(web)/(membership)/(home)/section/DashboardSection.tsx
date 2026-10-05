import DashboardView from "@/features/web/components/ui/DashboardView";
import type { AllTimeTotals } from "@/features/web/components/ui/StatsCards";
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

/**
 * Feature module dashboard: kartu keuntungan seluruh waktu + kartu mini
 * siklus aktif + pengeluaran harian + grafik historis (donut saldo, pie
 * kategori, bar alokasi bulanan, perbandingan & kumulatif tabungan).
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
  let initialAllTime: AllTimeTotals = { income: 0, spent: 0 };

  try {
    [initialTransactions, initialHistorical, initialAllTime] =
      await Promise.all([
        getCycleTransactionsAction(cycle),
        getHistoricalTransactionsAction(cycle, 6),
        getAllTimeTotals(user.id),
      ]);
  } catch (err) {
    console.error("[DashboardSection] gagal memuat data awal:", err);
  }

  return (
    <DashboardView
      initialTransactions={initialTransactions}
      initialHistorical={initialHistorical}
      initialAllTime={initialAllTime}
      categories={categories}
      settings={settings}
    />
  );
}

import ReportsView from "@/features/web/components/ui/ReportsView";
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
 * Feature module halaman Laporan: grafik historis + insight keyword.
 */
export default async function ReportsSection() {
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
    console.error("[ReportsSection] gagal memuat data awal:", err);
  }

  return (
    <ReportsView
      initialTransactions={initialTransactions}
      initialHistorical={initialHistorical}
      categories={categories}
      settings={settings}
    />
  );
}

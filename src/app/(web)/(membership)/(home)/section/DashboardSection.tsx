import DashboardView from "@/features/web/components/ui/DashboardView";
import { getCycleTransactionsAction } from "@/utils/server/actions";
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
 * Pengeluaran/Cash Flow + pengeluaran harian + breakdown wadah.
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
  try {
    initialTransactions = await getCycleTransactionsAction(cycle);
  } catch (err) {
    console.error("[DashboardSection] gagal memuat data awal:", err);
  }

  return (
    <DashboardView
      initialTransactions={initialTransactions}
      categories={categories}
      settings={settings}
    />
  );
}

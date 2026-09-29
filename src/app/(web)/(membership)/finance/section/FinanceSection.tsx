import FinanceView from "@/features/web/components/ui/finance/FinanceView";
import type {
  BudgetCategory,
  BudgetOverview,
  SavingsTarget,
  UserSettings,
} from "@/features/web/types";
import { getUserCategories, getUserSettings } from "@/services/transaction";
import { getBudgetOverview, getTargets } from "@/services/finance";
import { getCurrentUser } from "@/lib/auth";
import { ensureUserDefaults } from "@/services/user";
import { getCurrentCycle } from "@/features/web/utils/cycle";

/**
 * Feature module halaman Keuangan: Dompet (wadah bank/e-wallet),
 * Budget (proteksi tabungan per siklus), dan Target tabungan.
 */
export default async function FinanceSection() {
  const user = await getCurrentUser();
  if (!user) return null;
  await ensureUserDefaults(user.id);

  const [categories, settings]: [BudgetCategory[], UserSettings] =
    await Promise.all([
      getUserCategories(user.id),
      getUserSettings(user.id),
    ]);

  const cycle = getCurrentCycle(settings.cycleStartDay);
  const overview: BudgetOverview = await getBudgetOverview(user.id, cycle);
  const targets: SavingsTarget[] = await getTargets(user.id);

  return (
    <FinanceView
      initialCategories={categories}
      settings={settings}
      initialOverview={overview}
      initialTargets={targets}
    />
  );
}

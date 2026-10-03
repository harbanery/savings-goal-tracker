import BudgetView from "@/features/web/components/ui/finance/BudgetView";
import type { UserSettings } from "@/features/web/types";
import { getUserSettings } from "@/services/transaction";
import { getBudgetOverview } from "@/services/finance";
import { getCurrentUser } from "@/lib/auth";
import { ensureUserDefaults } from "@/services/user";
import { getCurrentCycle } from "@/features/web/utils/cycle";

/**
 * Feature module halaman Budget: tabungan dilindungi per siklus +
 * tanggal mulai siklus (dipindah dari Pengaturan).
 */
export default async function BudgetSection() {
  const user = await getCurrentUser();
  if (!user) return null;
  await ensureUserDefaults(user.id);

  const settings: UserSettings = await getUserSettings(user.id);
  const cycle = getCurrentCycle(settings.cycleStartDay);
  const overview = await getBudgetOverview(user.id, cycle);

  return <BudgetView initialOverview={overview} settings={settings} />;
}

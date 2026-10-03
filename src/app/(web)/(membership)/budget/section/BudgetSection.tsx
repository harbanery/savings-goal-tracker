import BudgetView from "@/features/web/components/ui/finance/BudgetView";
import type { UserSettings } from "@/features/web/types";
import { getUserCategories, getUserSettings } from "@/services/transaction";
import { getBudgetOverview } from "@/services/finance";
import { getCurrentUser } from "@/lib/auth";
import { ensureUserDefaults } from "@/services/user";
import { getCurrentCycle } from "@/features/web/utils/cycle";
import { getCycleTransactionsAction } from "@/utils/server/actions";

/**
 * Feature module halaman Budget: tabungan dilindungi per siklus +
 * tanggal mulai siklus (dipindah dari Pengaturan). UI mengikuti pola
 * referensi Dashboard Content.svg (kartu statistik + komposisi dana).
 */
export default async function BudgetSection() {
  const user = await getCurrentUser();
  if (!user) return null;
  await ensureUserDefaults(user.id);

  const settings: UserSettings = await getUserSettings(user.id);
  const cycle = getCurrentCycle(settings.cycleStartDay);

  // Transaksi siklus ditarik lebih dulu agar aturan berulang siklus ini
  // termaterialisasi sebelum agregasi overview dilakukan.
  const [categories, transactions] = await Promise.all([
    getUserCategories(user.id),
    getCycleTransactionsAction(cycle).catch(() => []),
  ]);
  const overview = await getBudgetOverview(user.id, cycle);

  return (
    <BudgetView
      initialOverview={overview}
      initialCategories={categories}
      initialTransactions={transactions}
      settings={settings}
    />
  );
}

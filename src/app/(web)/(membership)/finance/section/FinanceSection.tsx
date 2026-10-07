import WalletsView from "@/features/finance/components/ui/WalletsView";
import type { Transaction } from "@/features/web/types";
import { getUserCategories, getUserSettings } from "@/services/transaction";
import { getBudgetOverview } from "@/services/finance";
import { getCycleTransactionsAction } from "@/utils/server/actions";
import { getCurrentUser } from "@/lib/auth";
import { ensureUserDefaults } from "@/services/user";
import { getCurrentCycle } from "@/features/web/utils/cycle";

/**
 * Feature module halaman Keuangan: daftar wadah + progress dana per wadah
 * (pemasukan + transfer masuk − pengeluaran − transfer keluar — alokasi
 * tidak bisa diedit) + progress bar terpakai vs budget yang bisa
 * dialokasikan. Subkategori wadah ada di halaman Kebutuhan; Budget &
 * Target halaman terpisah.
 */
export default async function FinanceSection() {
  const user = await getCurrentUser();
  if (!user) return null;
  await ensureUserDefaults(user.id);

  const settings = await getUserSettings(user.id);
  const cycle = getCurrentCycle(settings.cycleStartDay);

  const [categories, overview] = await Promise.all([
    getUserCategories(user.id),
    getBudgetOverview(user.id, cycle),
  ]);

  // Transaksi siklus aktif untuk progress dana tiap wadah.
  let initialTransactions: Transaction[] = [];
  try {
    initialTransactions = await getCycleTransactionsAction(cycle);
  } catch (err) {
    console.error("[FinanceSection] gagal memuat data awal:", err);
  }

  return (
    <WalletsView
      initialCategories={categories}
      initialTransactions={initialTransactions}
      initialAllocatable={overview.allocatable}
      initialProtected={overview.protectedSavings}
    />
  );
}

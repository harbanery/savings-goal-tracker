import WalletsView from "@/features/web/components/ui/finance/WalletsView";
import type { Transaction } from "@/features/web/types";
import {
  getUserCategories,
  getUserSettings,
} from "@/services/transaction";
import { getCycleTransactionsAction } from "@/utils/server/actions";
import { getCurrentUser } from "@/lib/auth";
import { ensureUserDefaults } from "@/services/user";
import { getCurrentCycle } from "@/features/web/utils/cycle";

/**
 * Feature module halaman Keuangan: daftar wadah + progress bar batas &
 * sisa dana per wadah (alokasi + pemasukan + transfer masuk) siklus aktif.
 * Subkategori wadah ada di halaman Kebutuhan; Budget & Target halaman
 * terpisah.
 */
export default async function FinanceSection() {
  const user = await getCurrentUser();
  if (!user) return null;
  await ensureUserDefaults(user.id);

  const [categories, settings] = await Promise.all([
    getUserCategories(user.id),
    getUserSettings(user.id),
  ]);

  // Transaksi siklus aktif untuk progress bar & sisa dana tiap wadah.
  const cycle = getCurrentCycle(settings.cycleStartDay);
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
    />
  );
}

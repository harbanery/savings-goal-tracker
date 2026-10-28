import { Suspense } from "react";
import WalletsView from "@/features/finance/components/ui/WalletsView";
import type { Transaction } from "@/features/web/types";
import { getUserCategories, getUserSettings } from "@/services/transaction";
import { getBudgetOverview } from "@/services/finance";
import { getCycleTransactionsAction } from "@/utils/server/actions";
import { getCurrentUser } from "@/lib/auth";
import { ensureUserDefaults } from "@/services/user";
import { getCurrentCycle } from "@/features/web/utils/cycle";
import SectionSkeleton from "@/features/web/components/ui/sectionSkeleton";

/**
 * Feature module halaman Keuangan: daftar wadah + progress dana per wadah
 * (pemasukan + transfer masuk − pengeluaran − transfer keluar — alokasi
 * tidak bisa diedit) + progress bar terpakai vs budget yang bisa
 * dialokasikan. Subkategori wadah ada di halaman Kebutuhan; Budget &
 * Target halaman terpisah.
 *
 * A3 (rekomendasi_feature.md): daftar wadah + agregasi budget di-stream
 * di dalam `<Suspense>` — shell halaman tampil seketika.
 */
export default async function FinanceSection() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <Suspense fallback={<SectionSkeleton variant="list" />}>
      <FinanceData userId={user.id} />
    </Suspense>
  );
}

/** Muat wadah + ringkasan budget + transaksi siklus lalu render daftar. */
async function FinanceData({ userId }: { userId: string }) {
  await ensureUserDefaults(userId);

  const settings = await getUserSettings(userId);
  const cycle = getCurrentCycle(settings.cycleStartDay);

  const [categories, overview] = await Promise.all([
    getUserCategories(userId),
    getBudgetOverview(userId, cycle),
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
      initialWalletLocked={overview.walletLocked}
    />
  );
}

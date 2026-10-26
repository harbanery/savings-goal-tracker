import { Suspense } from "react";
import NeedsView from "@/features/needs/components/ui/NeedsView";
import type { Transaction } from "@/features/web/types";
import { getUserCategories, getUserSettings } from "@/services/transaction";
import { getCurrentUser } from "@/lib/auth";
import { ensureUserDefaults } from "@/services/user";
import { getCurrentCycle } from "@/features/web/utils/cycle";
import { getCycleTransactionsAction } from "@/utils/server/actions";
import SectionSkeleton from "@/features/web/components/ui/sectionSkeleton";

/**
 * Feature module halaman Kebutuhan: seluruh subkategori wadah — CRUD
 * subkategori (dipindahkan dari halaman Keuangan/Dompet).
 *
 * A3 (rekomendasi_feature.md): daftar subkategori di-stream di dalam
 * `<Suspense>` — shell halaman tampil seketika.
 */
export default async function NeedsSection() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <Suspense fallback={<SectionSkeleton variant="list" />}>
      <NeedsData userId={user.id} />
    </Suspense>
  );
}

/**
 * Muat wadah + transaksi siklus aktif lalu render daftar. Transaksi
 * dipakai NeedsView untuk statistik pemakaian per subkategori
 * (rekomendasi D4: Nx · Y% seperti ringkas di /finance).
 */
async function NeedsData({ userId }: { userId: string }) {
  await ensureUserDefaults(userId);

  const settings = await getUserSettings(userId);
  const cycle = getCurrentCycle(settings.cycleStartDay);

  const [categories, initialTransactions] = await Promise.all([
    getUserCategories(userId),
    getCycleTransactionsAction(cycle).catch(() => [] as Transaction[]),
  ]);

  return (
    <NeedsView
      initialCategories={categories}
      initialTransactions={initialTransactions}
    />
  );
}

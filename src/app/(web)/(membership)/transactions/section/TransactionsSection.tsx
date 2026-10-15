import { Suspense } from "react";
import TransactionsView from "@/features/transactions/components/ui/TransactionsView";
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
import SectionSkeleton from "@/features/web/components/ui/sectionSkeleton";

/**
 * Feature module halaman Transaksi: seluruh catatan transaksi siklus aktif.
 *
 * A3 (rekomendasi_feature.md): guard sesi cepat di shell, tabel transaksi
 * di-stream di dalam `<Suspense>` — navbar/sider tampil seketika.
 */
export default async function TransactionsSection() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <Suspense fallback={<SectionSkeleton variant="table" />}>
      <TransactionsData userId={user.id} />
    </Suspense>
  );
}

/** Muat data transaksi siklus aktif lalu render tabel. */
async function TransactionsData({ userId }: { userId: string }) {
  await ensureUserDefaults(userId);

  const [categories, settings]: [BudgetCategory[], UserSettings] =
    await Promise.all([getUserCategories(userId), getUserSettings(userId)]);

  const cycle = getCurrentCycle(settings.cycleStartDay);
  let initialTransactions: Transaction[] = [];
  try {
    initialTransactions = await getCycleTransactionsAction(cycle);
  } catch (err) {
    console.error("[TransactionsSection] gagal memuat data awal:", err);
  }

  return (
    <TransactionsView
      initialTransactions={initialTransactions}
      categories={categories}
    />
  );
}

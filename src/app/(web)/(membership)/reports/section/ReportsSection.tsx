import { Suspense } from "react";
import ReportsView from "@/features/reports/components/ui/ReportsView";
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
 * Feature module halaman Laporan: insight keyword. Batas wadah dipindah
 * ke halaman Keuangan; grafik historis dipindah ke Dashboard.
 *
 * A3 (rekomendasi_feature.md): insight di-stream di dalam `<Suspense>` —
 * shell halaman tampil seketika.
 */
export default async function ReportsSection() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <Suspense fallback={<SectionSkeleton variant="list" />}>
      <ReportsData userId={user.id} />
    </Suspense>
  );
}

/** Muat transaksi siklus aktif lalu render insight. */
async function ReportsData({ userId }: { userId: string }) {
  await ensureUserDefaults(userId);

  const [categories, settings]: [BudgetCategory[], UserSettings] =
    await Promise.all([getUserCategories(userId), getUserSettings(userId)]);

  const cycle = getCurrentCycle(settings.cycleStartDay);
  let initialTransactions: Transaction[] = [];

  try {
    initialTransactions = await getCycleTransactionsAction(cycle);
  } catch (err) {
    console.error("[ReportsSection] gagal memuat data awal:", err);
  }

  return (
    <ReportsView
      initialTransactions={initialTransactions}
      categories={categories}
    />
  );
}

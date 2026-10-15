import { Suspense } from "react";
import BudgetView from "@/features/budget/components/ui/BudgetView";
import type { UserSettings } from "@/features/web/types";
import { getUserSettings } from "@/services/transaction";
import { getBudgetOverview } from "@/services/finance";
import { getCurrentUser } from "@/lib/auth";
import { ensureUserDefaults } from "@/services/user";
import { getCurrentCycle } from "@/features/web/utils/cycle";
import SectionSkeleton from "@/features/web/components/ui/sectionSkeleton";

/**
 * Feature module halaman Budget: tabungan dilindungi per siklus +
 * tanggal mulai siklus (dipindah dari Pengaturan).
 *
 * A3 (rekomendasi_feature.md): kartu ringkasan di-stream di dalam
 * `<Suspense>` — shell halaman tampil seketika.
 */
export default async function BudgetSection() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <Suspense fallback={<SectionSkeleton variant="cards" />}>
      <BudgetData userId={user.id} />
    </Suspense>
  );
}

/** Muat ringkasan budget siklus aktif lalu render kartu + form. */
async function BudgetData({ userId }: { userId: string }) {
  await ensureUserDefaults(userId);

  const settings: UserSettings = await getUserSettings(userId);
  const cycle = getCurrentCycle(settings.cycleStartDay);
  const overview = await getBudgetOverview(userId, cycle);

  return <BudgetView initialOverview={overview} settings={settings} />;
}

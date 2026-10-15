import { Suspense } from "react";
import TargetsView from "@/features/target/components/ui/TargetsView";
import { getTargets } from "@/services/finance";
import { getUserCategories } from "@/services/transaction";
import { getCurrentUser } from "@/lib/auth";
import { ensureUserDefaults } from "@/services/user";
import SectionSkeleton from "@/features/web/components/ui/sectionSkeleton";

/**
 * Feature module halaman Target: target tabungan user (mis. beli HP,
 * tabungan 1 tahun) — dana terkumpul dihitung otomatis dari tabungan
 * bersih seluruh siklus pada wadah terpilih (semua / wadah tertentu),
 * tanpa tambah dana manual.
 *
 * A3 (rekomendasi_feature.md): kartu target di-stream di dalam
 * `<Suspense>` — shell halaman tampil seketika.
 */
export default async function TargetSection() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <Suspense fallback={<SectionSkeleton variant="cards" />}>
      <TargetData userId={user.id} />
    </Suspense>
  );
}

/** Muat target + wadah lalu render daftar target. */
async function TargetData({ userId }: { userId: string }) {
  await ensureUserDefaults(userId);

  const [targets, categories] = await Promise.all([
    getTargets(userId),
    getUserCategories(userId),
  ]);

  return <TargetsView initialTargets={targets} categories={categories} />;
}

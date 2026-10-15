import { Suspense } from "react";
import NeedsView from "@/features/needs/components/ui/NeedsView";
import type { BudgetCategory } from "@/features/web/types";
import { getUserCategories } from "@/services/transaction";
import { getCurrentUser } from "@/lib/auth";
import { ensureUserDefaults } from "@/services/user";
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

/** Muat wadah + subkategori lalu render daftar. */
async function NeedsData({ userId }: { userId: string }) {
  await ensureUserDefaults(userId);

  const categories: BudgetCategory[] = await getUserCategories(userId);

  return <NeedsView initialCategories={categories} />;
}

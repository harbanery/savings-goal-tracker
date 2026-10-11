import TargetsView from "@/features/target/components/ui/TargetsView";
import { getTargets } from "@/services/finance";
import { getUserCategories } from "@/services/transaction";
import { getCurrentUser } from "@/lib/auth";
import { ensureUserDefaults } from "@/services/user";

/**
 * Feature module halaman Target: target tabungan user (mis. beli HP,
 * tabungan 1 tahun) — dana terkumpul dihitung otomatis dari tabungan
 * bersih seluruh siklus pada wadah terpilih (semua / wadah tertentu),
 * tanpa tambah dana manual.
 */
export default async function TargetSection() {
  const user = await getCurrentUser();
  if (!user) return null;
  await ensureUserDefaults(user.id);

  const [targets, categories] = await Promise.all([
    getTargets(user.id),
    getUserCategories(user.id),
  ]);

  return <TargetsView initialTargets={targets} categories={categories} />;
}

import TargetsView from "@/features/web/components/ui/finance/TargetsView";
import type { SavingsTarget } from "@/features/web/types";
import { getTargets } from "@/services/finance";
import { getCurrentUser } from "@/lib/auth";
import { ensureUserDefaults } from "@/services/user";

/**
 * Feature module halaman Target: target tabungan user (mis. beli HP,
 * tabungan 1 tahun) — progres terkumpul + tambah dana manual.
 */
export default async function TargetSection() {
  const user = await getCurrentUser();
  if (!user) return null;
  await ensureUserDefaults(user.id);

  const targets: SavingsTarget[] = await getTargets(user.id);

  return <TargetsView initialTargets={targets} />;
}

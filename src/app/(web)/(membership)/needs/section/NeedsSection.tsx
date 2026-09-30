import NeedsView from "@/features/web/components/ui/finance/NeedsView";
import type { BudgetCategory } from "@/features/web/types";
import { getUserCategories } from "@/services/transaction";
import { getCurrentUser } from "@/lib/auth";
import { ensureUserDefaults } from "@/services/user";

/**
 * Feature module halaman Kebutuhan: seluruh subkategori wadah — CRUD
 * subkategori (dipindahkan dari halaman Keuangan/Dompet).
 */
export default async function NeedsSection() {
  const user = await getCurrentUser();
  if (!user) return null;
  await ensureUserDefaults(user.id);

  const categories: BudgetCategory[] = await getUserCategories(user.id);

  return <NeedsView initialCategories={categories} />;
}

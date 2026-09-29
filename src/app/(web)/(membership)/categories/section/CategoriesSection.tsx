import CategoriesView from "@/features/web/components/ui/CategoriesView";
import type { BudgetCategory } from "@/features/web/types";
import { getUserCategories } from "@/services/transaction";
import { getCurrentUser } from "@/lib/auth";
import { ensureUserDefaults } from "@/services/user";

/**
 * Feature module halaman Kategori: tabel wadah & subkategori
 * (dipindah dari halaman Pengaturan).
 */
export default async function CategoriesSection() {
  const user = await getCurrentUser();
  if (!user) return null;
  await ensureUserDefaults(user.id);

  const categories: BudgetCategory[] = await getUserCategories(user.id);

  return <CategoriesView initialCategories={categories} />;
}

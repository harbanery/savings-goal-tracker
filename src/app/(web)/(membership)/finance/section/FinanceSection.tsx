import WalletsView from "@/features/web/components/ui/finance/WalletsView";
import type { BudgetCategory } from "@/features/web/types";
import { getUserCategories } from "@/services/transaction";
import { getCurrentUser } from "@/lib/auth";
import { ensureUserDefaults } from "@/services/user";

/**
 * Feature module halaman Keuangan (Dompet): wadah bank/e-wallet +
 * subkategori. Budget & Target menjadi halaman terpisah.
 */
export default async function FinanceSection() {
  const user = await getCurrentUser();
  if (!user) return null;
  await ensureUserDefaults(user.id);

  const categories: BudgetCategory[] = await getUserCategories(user.id);

  return <WalletsView initialCategories={categories} />;
}

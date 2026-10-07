import { buildPageMetadata } from "@/utils/helpers";
import BudgetSection from "./section/BudgetSection";

// Selalu render dinamis agar data terbaru dari DB selalu ditampilkan.
export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata("menu.budget", "meta.descBudget");

export default function BudgetPage() {
  return <BudgetSection />;
}

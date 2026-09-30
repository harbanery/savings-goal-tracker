import BudgetSection from "./section/BudgetSection";

// Selalu render dinamis agar data terbaru dari DB selalu ditampilkan.
export const dynamic = "force-dynamic";

export default function BudgetPage() {
  return <BudgetSection />;
}

import FinanceSection from "./section/FinanceSection";

// Selalu render dinamis agar data terbaru dari DB selalu ditampilkan.
export const dynamic = "force-dynamic";

export default function FinancePage() {
  return <FinanceSection />;
}

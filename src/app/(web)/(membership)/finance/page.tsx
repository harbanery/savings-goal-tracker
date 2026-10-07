import { buildPageMetadata } from "@/utils/helpers";
import FinanceSection from "./section/FinanceSection";

// Selalu render dinamis agar data terbaru dari DB selalu ditampilkan.
export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata("menu.finance", "meta.descFinance");

export default function FinancePage() {
  return <FinanceSection />;
}

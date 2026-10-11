import { buildPageMetadata } from "@/utils/helpers";
import ReportsSection from "./section/ReportsSection";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata("menu.reports", "meta.descReports");

export default function ReportsPage() {
  return <ReportsSection />;
}

import { buildPageMetadata } from "@/utils/helpers";
import DashboardSection from "./section/DashboardSection";

// Selalu render dinamis agar data terbaru dari DB selalu ditampilkan.
export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata("menu.dashboard", "app.description");

export default function Home() {
  return <DashboardSection />;
}

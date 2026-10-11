import { buildPageMetadata } from "@/utils/helpers";
import TargetSection from "./section/TargetSection";

// Selalu render dinamis agar data terbaru dari DB selalu ditampilkan.
export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata("menu.target", "meta.descTarget");

export default function TargetPage() {
  return <TargetSection />;
}

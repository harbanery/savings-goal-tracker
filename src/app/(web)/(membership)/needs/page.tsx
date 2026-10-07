import { buildPageMetadata } from "@/utils/helpers";
import NeedsSection from "./section/NeedsSection";

// Selalu render dinamis agar data terbaru dari DB selalu ditampilkan.
export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata("menu.needs", "meta.descNeeds");

export default function NeedsPage() {
  return <NeedsSection />;
}

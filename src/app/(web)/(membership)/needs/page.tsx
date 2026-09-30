import NeedsSection from "./section/NeedsSection";

// Selalu render dinamis agar data terbaru dari DB selalu ditampilkan.
export const dynamic = "force-dynamic";

export default function NeedsPage() {
  return <NeedsSection />;
}

import TargetSection from "./section/TargetSection";

// Selalu render dinamis agar data terbaru dari DB selalu ditampilkan.
export const dynamic = "force-dynamic";

export default function TargetPage() {
  return <TargetSection />;
}

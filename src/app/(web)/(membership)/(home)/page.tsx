import DashboardSection from "./section/DashboardSection";

// Selalu render dinamis agar data terbaru dari DB selalu ditampilkan.
export const dynamic = "force-dynamic";

export default function Home() {
  return <DashboardSection />;
}

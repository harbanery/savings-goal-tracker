import CategoriesSection from "./section/CategoriesSection";

// Selalu render dinamis agar data terbaru dari DB selalu ditampilkan.
export const dynamic = "force-dynamic";

export default function CategoriesPage() {
  return <CategoriesSection />;
}

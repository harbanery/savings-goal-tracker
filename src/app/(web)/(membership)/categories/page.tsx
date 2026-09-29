import { redirect } from "next/navigation";

// Menu Kategori digabung ke menu Keuangan (tab Dompet).
export default function CategoriesPage() {
  redirect("/finance");
}

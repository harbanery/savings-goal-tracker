import SavingsDashboard from "@/components/savings/SavingsDashboard";
import { getGoalsAction } from "@/server/actions";
import type { SavingsGoal } from "@/models/types";

// Selalu render dinamis agar data terbaru dari DB selalu ditampilkan.
export const dynamic = "force-dynamic";

export default async function Home() {
  let initialGoals: SavingsGoal[] = [];
  try {
    initialGoals = await getGoalsAction();
  } catch (err) {
    // DB mungkin belum dikonfigurasi; render state kosong agar UI tetap muncul.
    console.error("[page] gagal memuat goals awal:", err);
  }

  return <SavingsDashboard initialGoals={initialGoals} />;
}

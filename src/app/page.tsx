import BudgetDashboard from "@/components/budget/BudgetDashboard";
import {
  getCyclePurchasesAction,
  getHistoricalPurchasesAction,
} from "@/server/actions";
import type { Purchase } from "@/models/types";
import { getCurrentCycle } from "@/utils/cycleUtils";

// Selalu render dinamis agar data terbaru dari DB selalu ditampilkan.
export const dynamic = "force-dynamic";

export default async function Home() {
  const cycle = getCurrentCycle();
  let initialPurchases: Purchase[] = [];
  let initialHistorical: Record<string, Purchase[]> = {};
  try {
    initialPurchases = await getCyclePurchasesAction(cycle);
    initialHistorical = await getHistoricalPurchasesAction(cycle, 6);
  } catch (err) {
    // DB mungkin belum dikonfigurasi; render state kosong agar UI tetap muncul.
    console.error("[page] gagal memuat data awal:", err);
  }

  return (
    <BudgetDashboard
      initialPurchases={initialPurchases}
      initialHistorical={initialHistorical}
    />
  );
}

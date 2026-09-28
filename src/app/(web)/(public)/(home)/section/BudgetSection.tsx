import BudgetDashboard from "@/features/web/components/ui/BudgetDashboard";
import {
  getCyclePurchasesAction,
  getHistoricalPurchasesAction,
} from "@/utils/server/actions";
import type { Purchase } from "@/features/web/types";
import { getCurrentCycle } from "@/features/web/utils/cycle";
import { IS_DEMO } from "@/utils/config/variables";

/**
 * Feature module beranda: muat data awal siklus + historis dari server,
 * lalu render dashboard. Page entry (page.tsx) tetap setipis mungkin.
 */
export default async function BudgetSection() {
  const cycle = getCurrentCycle();
  let initialPurchases: Purchase[] = [];
  let initialHistorical: Record<string, Purchase[]> = {};

  if (!IS_DEMO) {
    try {
      initialPurchases = await getCyclePurchasesAction(cycle);
      initialHistorical = await getHistoricalPurchasesAction(cycle, 6);
    } catch (err) {
      // DB mungkin belum dikonfigurasi; render state kosong agar UI tetap muncul.
      console.error("[BudgetSection] gagal memuat data awal:", err);
    }
  }

  return (
    <BudgetDashboard
      initialPurchases={initialPurchases}
      initialHistorical={initialHistorical}
    />
  );
}

import type { BudgetCategory } from "./types";

/**
 * Definisi kategori/wadah sistem berdasarkan savingsPlan.md.
 * Kategori dengan `excludeFromAllocation` (mis. Belanja) tidak masuk
 * ke total alokasi wadah dan tidak punya budget sendiri.
 */
export const CATEGORIES: BudgetCategory[] = [
  {
    id: "kos",
    label: "Bayar Kos",
    description: "Khusus bayar Kos",
    color: "#6366f1",
    allocation: 1_000_000,
  },
  {
    id: "shopeepay",
    label: "ShopeePay",
    description: "Makan malam ShopeeFood",
    color: "#f97316",
    allocation: 700_000,
  },
  {
    id: "gopay",
    label: "GoPay",
    description: "Antar-jemput Gojek + Paket Kuota",
    color: "#22c55e",
    allocation: 400_000,
  },
  {
    id: "e-money",
    label: "E-Money",
    description: "Transportasi KRL + Bayar Parkir",
    color: "#3b82f6",
    allocation: 200_000,
  },
  {
    id: "cash-dompet",
    label: "Cash (Dompet)",
    description: "Bensin Motor + Kuliner Cash",
    color: "#f59e0b",
    allocation: 300_000,
  },
  {
    id: "langganan",
    label: "Langganan",
    description: "Spotify, G-One, YT, Railway, Laundry",
    color: "#ec4899",
    allocation: 250_000,
  },
  {
    id: "belanja",
    label: "Belanja",
    description: "Pembelian lain di luar wadah",
    color: "#8b5cf6",
    allocation: 0,
    excludeFromAllocation: true,
  },
];

export const CATEGORY_MAP: Record<string, BudgetCategory> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
);

/** Total alokasi wadah (hanya kategori yang tidak di-exclude). */
export const TOTAL_ALLOCATION: number = CATEGORIES.filter(
  (c) => !c.excludeFromAllocation,
).reduce((acc, c) => acc + c.allocation, 0);

import type { BudgetCategory } from "./types";

/**
 * Definisi kategori/wadah sistem berdasarkan savingsPlan.md
 * (kecuali surplus bulanan - surplus dihitung otomatis dari SAVINGS_INITIAL).
 *
 * Setiap wadah punya alokasi saldo per siklus bulanan.
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
    allocation: 300_000,
  },
  {
    id: "e-money",
    label: "E-Money",
    description: "Transportasi KRL + Bayar Parkir",
    color: "#3b82f6",
    allocation: 100_000,
  },
  {
    id: "cash-dompet",
    label: "Cash (Dompet)",
    description: "Bensin Motor + Kuliner Cash",
    color: "#f59e0b",
    allocation: 300_000,
  },
  {
    id: "dana-taktis",
    label: "Dana Taktis",
    description: "Spotify, G-One, YT, Railway, Laundry",
    color: "#ec4899",
    allocation: 218_000,
  },
];

export const CATEGORY_MAP: Record<string, BudgetCategory> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
);

/** Total alokasi semua wadah (tidak termasuk surplus). */
export const TOTAL_ALLOCATION: number = CATEGORIES.reduce(
  (acc, c) => acc + c.allocation,
  0,
);

import type { BudgetCategory } from "./types";

/**
 * Definisi kategori/wadah sistem berdasarkan savingsPlan.md.
 * Kategori dengan `excludeFromAllocation` (mis. Belanja) tidak masuk
 * ke total alokasi wadah dan tidak punya budget sendiri.
 */
export const CATEGORIES: BudgetCategory[] = [
  {
    id: "kos",
    label: { id: "Bayar Kos", en: "Boarding Rent" },
    description: { id: "Khusus bayar Kos", en: "Boarding rent only" },
    color: "#6366f1",
    allocation: 1_000_000,
  },
  {
    id: "shopeepay",
    label: { id: "ShopeePay", en: "ShopeePay" },
    description: {
      id: "Makan malam ShopeeFood",
      en: "ShopeeFood dinner",
    },
    color: "#f97316",
    allocation: 700_000,
  },
  {
    id: "gopay",
    label: { id: "GoPay", en: "GoPay" },
    description: {
      id: "Antar-jemput Gojek + Paket Kuota",
      en: "Gojek transport + Data plan",
    },
    color: "#22c55e",
    allocation: 400_000,
  },
  {
    id: "e-money",
    label: { id: "E-Money", en: "E-Money" },
    description: {
      id: "Transportasi KRL + Bayar Parkir",
      en: "KRL transport + Parking",
    },
    color: "#3b82f6",
    allocation: 200_000,
  },
  {
    id: "cash-dompet",
    label: { id: "Cash (Dompet)", en: "Cash (Wallet)" },
    description: {
      id: "Bensin Motor + Kuliner Cash",
      en: "Motor gas + Cash dining",
    },
    color: "#f59e0b",
    allocation: 300_000,
  },
  {
    id: "langganan",
    label: { id: "Langganan", en: "Subscriptions" },
    description: {
      id: "Spotify, G-One, YT, Railway, Laundry",
      en: "Spotify, G-One, YT, Railway, Laundry",
    },
    color: "#ec4899",
    allocation: 250_000,
  },
  {
    id: "belanja",
    label: { id: "Belanja", en: "Shopping" },
    description: {
      id: "Pembelian lain di luar wadah",
      en: "Other purchases outside envelopes",
    },
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

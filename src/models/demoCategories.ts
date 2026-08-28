import type { BudgetCategory } from "./types";

/**
 * Kategori & subkategori generik untuk MODE MOCKUP PUBLIK (demo).
 * Dipakai ketika DATABASE_URL kosong sehingga mockup tidak bergantung
 * pada kategori pribadi pemilik aplikasi. Pengunjung bebas mencoba
 * seluruh fitur; data hanya tersimpan di memori (hilang saat reload).
 */
export const DEMO_CATEGORIES: BudgetCategory[] = [
  {
    id: "cash",
    label: { id: "Cash", en: "Cash" },
    description: {
      id: "Uang tunai untuk kebutuhan harian",
      en: "Cash for daily needs",
    },
    color: "#f59e0b",
    allocation: 300_000,
    subcategories: [
      { id: "cash-food", label: { id: "Makanan", en: "Food" } },
      { id: "cash-transport", label: { id: "Transportasi", en: "Transport" } },
      { id: "cash-laundry", label: { id: "Laundry", en: "Laundry" } },
    ],
  },
  {
    id: "bank-transfer",
    label: { id: "Transfer Bank", en: "Bank Transfer" },
    description: {
      id: "Transfer untuk tagihan besar",
      en: "Transfers for major bills",
    },
    color: "#6366f1",
    allocation: 1_500_000,
    subcategories: [
      { id: "rent", label: { id: "Sewa", en: "Rent" } },
      { id: "groceries", label: { id: "Belanja Bulanan", en: "Groceries" } },
      { id: "utilities", label: { id: "Tagihan", en: "Utilities" } },
    ],
  },
  {
    id: "e-wallet",
    label: { id: "E-Wallet", en: "E-Wallet" },
    description: {
      id: "Dompet digital untuk transaksi harian",
      en: "Digital wallet for daily transactions",
    },
    color: "#22c55e",
    allocation: 400_000,
    subcategories: [
      { id: "wallet-food", label: { id: "Makanan", en: "Food" } },
      { id: "wallet-ride", label: { id: "Ojol", en: "Ride-hailing" } },
      { id: "wallet-shopping", label: { id: "Belanja", en: "Shopping" } },
    ],
  },
  {
    id: "subscriptions",
    label: { id: "Langganan", en: "Subscriptions" },
    description: {
      id: "Streaming, musik, dan layanan bulanan",
      en: "Streaming, music, and monthly services",
    },
    color: "#ec4899",
    allocation: 150_000,
  },
  {
    id: "transport-card",
    label: { id: "Kartu Transportasi", en: "Transport Card" },
    description: {
      id: "KRL/MRT dan parkir",
      en: "Commuter/MRT and parking",
    },
    color: "#3b82f6",
    allocation: 100_000,
    subcategories: [
      { id: "commute", label: { id: "KRL/MRT", en: "Commuter/MRT" } },
      { id: "parking", label: { id: "Parkir", en: "Parking" } },
    ],
  },
];

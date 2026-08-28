import type { BudgetCategory, BudgetUnit, Locale } from "./types";

/**
 * Definisi kategori/wadah + subkategori berdasarkan rencana alokasi terbaru.
 *
 * Setiap kategori (wadah e-wallet/cash) memiliki alokasi saldo per siklus.
 * Pengeluaran dicatat per SUBKATEGORI (unit); total kategori adalah
 * akumulasi dari seluruh subkategori di dalamnya. Kategori tanpa
 * subkategori (Jenius - Langganan, Link Aja - Paket Kuota) memakai
 * ID kategori itu sendiri sebagai unit pencatatan.
 *
 * ID lama tidak dihapus: pembelian lama tetap tersimpan di DB dengan
 * ID lamanya dan dipetakan otomatis via LEGACY_ALIASES di bawah.
 */
export const CATEGORIES: BudgetCategory[] = [
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
      {
        id: "cash-makanan",
        label: { id: "Makanan", en: "Food" },
      },
      {
        id: "cash-bensin",
        label: { id: "Bensin", en: "Fuel" },
      },
      {
        id: "cash-laundry",
        label: { id: "Laundry", en: "Laundry" },
      },
    ],
  },
  {
    id: "livin",
    label: { id: "Livin", en: "Livin" },
    description: {
      id: "Transfer utama: kos, belanja, laundry, makanan",
      en: "Main transfers: rent, shopping, laundry, food",
    },
    color: "#6366f1",
    allocation: 2_500_000,
    subcategories: [
      {
        id: "livin-kos",
        label: { id: "Bayar Kos", en: "Boarding Rent" },
        description: {
          id: "Khusus bayar Kos",
          en: "Boarding rent only",
        },
      },
      {
        id: "livin-belanja",
        label: { id: "Belanja", en: "Shopping" },
      },
      {
        id: "livin-laundry",
        label: { id: "Laundry", en: "Laundry" },
      },
      {
        id: "livin-makanan",
        label: { id: "Makanan", en: "Food" },
      },
    ],
  },
  {
    id: "jenius",
    label: { id: "Jenius", en: "Jenius" },
    description: {
      id: "Spotify, G-One, YT, Railway",
      en: "Spotify, G-One, YT, Railway",
    },
    color: "#ec4899",
    allocation: 550_000,
  },
  {
    id: "gopay",
    label: { id: "GoPay", en: "GoPay" },
    description: {
      id: "Gojek, paket kuota, dan makanan",
      en: "Gojek, data plan, and food",
    },
    color: "#22c55e",
    allocation: 450_000,
    subcategories: [
      {
        id: "gopay-makanan",
        label: { id: "Makanan", en: "Food" },
      },
      {
        id: "gopay-kuota",
        label: { id: "Paket Kuota", en: "Data Plan" },
        description: {
          id: "Backup link kuota",
          en: "Data plan backup link",
        },
      },
      {
        id: "gopay-ojol",
        label: { id: "GoJek", en: "GoJek" },
      },
    ],
  },
  {
    id: "shopeepay",
    label: { id: "ShopeePay", en: "ShopeePay" },
    description: {
      id: "Makanan, belanja, dan lainnya",
      en: "Food, shopping, and others",
    },
    color: "#f97316",
    allocation: 1_000_000,
    subcategories: [
      {
        id: "shopeepay-makanan",
        label: { id: "Makanan", en: "Food" },
      },
      {
        id: "shopeepay-belanja",
        label: { id: "Belanja", en: "Shopping" },
      },
      {
        id: "shopeepay-lainnya",
        label: { id: "Lainnya", en: "Others" },
      },
    ],
  },
  {
    id: "e-money",
    label: { id: "E-Money", en: "E-Money" },
    description: {
      id: "Transportasi KRL + bayar parkir",
      en: "KRL transport + parking",
    },
    color: "#3b82f6",
    allocation: 100_000,
    subcategories: [
      {
        id: "e-money-parkir",
        label: { id: "Parkir", en: "Parking" },
      },
      {
        id: "e-money-krl",
        label: { id: "KRL", en: "Commuter Line" },
      },
    ],
  },
  {
    id: "linkaja",
    label: { id: "Link Aja", en: "Link Aja" },
    description: {
      id: "Backup paket kuota bulanan",
      en: "Monthly data plan backup",
    },
    color: "#8b5cf6",
    allocation: 100_000,
  },
];

export const CATEGORY_MAP: Record<string, BudgetCategory> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
);

/**
 * Daftar flat seluruh unit pencatatan (subkategori, atau kategori itu
 * sendiri untuk wadah tanpa subkategori). Urutan mengikuti CATEGORIES.
 */
export const UNITS: BudgetUnit[] = CATEGORIES.flatMap((c) => {
  if (c.subcategories && c.subcategories.length > 0) {
    return c.subcategories.map((s) => ({
      id: s.id,
      label: s.label,
      description: s.description,
      categoryId: c.id,
      color: c.color,
    }));
  }
  return [
    {
      id: c.id,
      label: c.label,
      description: c.description,
      categoryId: c.id,
      color: c.color,
    },
  ];
});

export const UNIT_MAP: Record<string, BudgetUnit> = Object.fromEntries(
  UNITS.map((u) => [u.id, u]),
);

/**
 * Pemetaan ID/label kategori lama -> unit baru. ID lama TIDAK dihapus
 * dari DB; pembelian lama tetap memakai ID ini dan diselesaikan saat
 * runtime lewat resolveUnitId. Target unit dipilih berdasarkan
 * kebiasaan paling sering di masing-masing wadah lama:
 * - cash-dompet -> Bensin (paling sering)
 * - gopay -> Ojol (paling sering)
 * - e-money -> KRL (paling sering)
 * - shopeepay -> Makanan (paling sering)
 * - langganan -> Jenius - Langganan (kategori itu sendiri)
 * - belanja -> ShopeePay/Lainnya (wadah cadangan "lainnya")
 * - kos -> tetap "livin-kos" (kini subkategori Livin)
 */
export const LEGACY_ALIASES: Record<string, string> = {
  // Berdasarkan ID lama
  kos: "livin-kos",
  "cash-dompet": "cash-bensin",
  gopay: "gopay-ojol",
  "e-money": "e-money-krl",
  shopeepay: "shopeepay-makanan",
  langganan: "jenius",
  belanja: "livin-belanja",
  // Berdasarkan label lama (untuk import CSV ekspor lama)
  "bayar kos": "livin-kos",
  "boarding rent": "livin-kos",
  "cash (dompet)": "cash-bensin",
  "cash (wallet)": "cash-bensin",
  subscriptions: "jenius",
  shopping: "livin-belanja",
};

/** Total alokasi wadah (semua kategori kini teralokasi). */
export const TOTAL_ALLOCATION: number = CATEGORIES.reduce(
  (acc, c) => acc + c.allocation,
  0,
);

/**
 * Selesaikan ID mentah dari DB/form menjadi ID unit yang valid.
 * ID unit baru dikembalikan apa adanya; ID lama dipetakan via
 * LEGACY_ALIASES; ID tak dikenal dikembalikan apa adanya.
 */
export function resolveUnitId(id: string): string {
  if (UNIT_MAP[id]) return id;
  return LEGACY_ALIASES[id] ?? id;
}

/** Cari unit pencatatan dari ID mentah (legacy-aware). */
export function getUnit(id: string): BudgetUnit | undefined {
  return UNIT_MAP[resolveUnitId(id)];
}

/** Daftar unit dalam satu kategori. */
export function getUnitsOfCategory(categoryId: string): BudgetUnit[] {
  return UNITS.filter((u) => u.categoryId === categoryId);
}

/** ID kategori/wadah induk dari sebuah unit (legacy-aware). */
export function getParentCategoryId(unitId: string): string {
  return getUnit(unitId)?.categoryId ?? unitId;
}

/** Label tampilan unit + kategori induknya, mis. "Ojol (GoJek) · GoPay". */
export function getUnitFullLabel(unitId: string, locale: Locale) {
  const unit = getUnit(unitId);
  if (!unit) return unitId;
  const cat = CATEGORY_MAP[unit.categoryId];
  if (!cat || unit.id === cat.id) return unit.label[locale] ?? unit.label.id;
  return `${unit.label[locale] ?? unit.label.id} · ${cat.label[locale] ?? cat.label.id}`;
}

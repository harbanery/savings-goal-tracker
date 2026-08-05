import { CATEGORY_MAP } from "@/models/categories";
import type { LocaleText, Purchase } from "@/models/types";

/**
 * Statistik untuk satu keyword (nama pembelian yang paling sering muncul).
 */
export interface KeywordStat {
  /** Kunci netral (lowercase + trimmed) untuk grouping. */
  key: string;
  /** Label tampilan (memakai casing asli dari kemunculan pertama). */
  label: string;
  /** Jumlah kemunculan. */
  count: number;
  /** Total biaya untuk keyword ini. */
  totalSpent: number;
  /** ID kategori/wadah paling sering dipakai untuk keyword ini. */
  primaryCategoryId: string;
  /** Warna kategori utama (untuk indikator). */
  categoryColor: string;
  /** Label lokal kategori utama. */
  categoryLabel: LocaleText;
  /** Semua kategori/wadah tempat keyword ini muncul (unik, terurut by frekuensi). */
  categoryIds: string[];
}

/** Normalisasi nama: trim + lowercase + collapse whitespace berlebih. */
function normalizeKeyword(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Hitung top-N keyword (nama pembelian paling sering muncul) dari daftar
 * pembelian. Setiap keyword dikaitkan dengan wadah/kategori alokasi utamanya.
 *
 * @param purchases daftar pembelian dalam satu (atau beberapa) siklus
 * @param limit jumlah keyword yang dikembalikan (default 5)
 */
export function getTopKeywords(
  purchases: Purchase[],
  limit: number = 5,
): KeywordStat[] {
  const groups = new Map<
    string,
    {
      label: string;
      count: number;
      totalSpent: number;
      categoryCounts: Map<string, number>;
      categoryIds: string[];
    }
  >();

  for (const p of purchases) {
    if (!p.name) continue;
    const key = normalizeKeyword(p.name);
    if (!key) continue;

    let g = groups.get(key);
    if (!g) {
      g = {
        // Simpan label asli (casing pertama kemunculan) untuk tampilan.
        label: p.name.trim(),
        count: 0,
        totalSpent: 0,
        categoryCounts: new Map<string, number>(),
        categoryIds: [],
      };
      groups.set(key, g);
    }
    g.count += 1;
    g.totalSpent += p.amount;
    g.categoryCounts.set(
      p.categoryId,
      (g.categoryCounts.get(p.categoryId) ?? 0) + 1,
    );
  }

  const results: KeywordStat[] = [];
  for (const [key, g] of groups) {
    // Tentukan kategori utama = kategori dengan frekuensi tertinggi.
    let primaryCategoryId = "";
    let primaryCount = -1;
    for (const [catId, cnt] of g.categoryCounts) {
      if (cnt > primaryCount) {
        primaryCount = cnt;
        primaryCategoryId = catId;
      }
    }
    const cat = CATEGORY_MAP[primaryCategoryId];
    // Kategori unik terurut by frekuensi (desc).
    const categoryIds = [...g.categoryCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);

    results.push({
      key,
      label: g.label,
      count: g.count,
      totalSpent: g.totalSpent,
      primaryCategoryId,
      categoryColor: cat?.color ?? "#8b5cf6",
      categoryLabel:
        cat?.label ?? ({ id: primaryCategoryId, en: primaryCategoryId } as LocaleText),
      categoryIds,
    });
  }

  // Urutkan: count desc, lalu totalSpent desc, lalu label asc (stabil).
  results.sort(
    (a, b) =>
      b.count - a.count || b.totalSpent - a.totalSpent || a.label.localeCompare(b.label),
  );

  return results.slice(0, limit);
}

/** Apakah ada data keyword yang bisa ditampilkan? */
export function hasKeywordData(purchases: Purchase[]): boolean {
  return purchases.some((p) => p.name && p.name.trim().length > 0);
}

import { getCategory, getParentCategoryId } from "@/features/web/utils/categories";
import type { BudgetCategory, Transaction } from "@/features/web/types";

/**
 * Statistik untuk satu keyword (nama transaksi yang paling sering muncul).
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
  /** Nama kategori utama. */
  categoryLabel: string;
  /** Semua kategori/wadah tempat keyword ini muncul (unik, terurut by frekuensi). */
  categoryIds: string[];
}

/** Normalisasi nama: trim + lowercase + collapse whitespace berlebih. */
function normalizeKeyword(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Hitung top-N keyword (nama transaksi paling sering muncul, EXPENSE saja)
 * dari daftar transaksi. Setiap keyword dikaitkan dengan wadah utamanya.
 *
 * @param transactions daftar transaksi dalam satu (atau beberapa) siklus
 * @param categories kategori milik user
 * @param limit jumlah keyword yang dikembalikan (default 5)
 */
export function getTopKeywords(
  transactions: Transaction[],
  categories: BudgetCategory[],
  limit: number = 5,
): KeywordStat[] {
  const groups = new Map<
    string,
    {
      label: string;
      count: number;
      totalSpent: number;
      categoryCounts: Map<string, number>;
    }
  >();

  for (const tr of transactions) {
    if (tr.type !== "EXPENSE" || !tr.name) continue;
    const key = normalizeKeyword(tr.name);
    if (!key) continue;

    let g = groups.get(key);
    if (!g) {
      g = {
        label: tr.name.trim(),
        count: 0,
        totalSpent: 0,
        categoryCounts: new Map<string, number>(),
      };
      groups.set(key, g);
    }
    g.count += 1;
    g.totalSpent += tr.amount;
    const catId = getParentCategoryId(categories, tr.categoryId);
    g.categoryCounts.set(catId, (g.categoryCounts.get(catId) ?? 0) + 1);
  }

  const results: KeywordStat[] = [];
  for (const [key, g] of groups) {
    let primaryCategoryId = "";
    let primaryCount = -1;
    for (const [catId, cnt] of g.categoryCounts) {
      if (cnt > primaryCount) {
        primaryCount = cnt;
        primaryCategoryId = catId;
      }
    }
    const cat = getCategory(categories, primaryCategoryId);
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
      categoryLabel: cat?.name ?? primaryCategoryId,
      categoryIds,
    });
  }

  results.sort(
    (a, b) =>
      b.count - a.count ||
      b.totalSpent - a.totalSpent ||
      a.label.localeCompare(b.label),
  );

  return results.slice(0, limit);
}

/** Apakah ada data keyword yang bisa ditampilkan? */
export function hasKeywordData(transactions: Transaction[]): boolean {
  return transactions.some(
    (tr) => tr.type === "EXPENSE" && tr.name && tr.name.trim().length > 0,
  );
}

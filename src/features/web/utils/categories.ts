import type { BudgetCategory, BudgetSubcategory } from "@/features/web/types";

/**
 * Helper kategori runtime (data kategori kini per-user dari DB —
 * fungsi di sini menerima daftar kategori sebagai parameter, bukan
 * membaca konstanta global lagi).
 */

export interface BudgetUnit {
  id: string;
  name: string;
  categoryId: string;
  color: string;
}

/** Daftar flat seluruh unit pencatatan (subkategori, atau kategori
 *  itu sendiri untuk wadah tanpa subkategori). */
export function buildUnits(categories: BudgetCategory[]): BudgetUnit[] {
  return categories.flatMap((c) => {
    if (c.subcategories.length > 0) {
      return c.subcategories.map((s) => ({
        id: s.id,
        name: s.name,
        categoryId: c.id,
        color: c.color,
      }));
    }
    return [{ id: c.id, name: c.name, categoryId: c.id, color: c.color }];
  });
}

/** Peta unit id → unit. */
export function buildUnitMap(
  categories: BudgetCategory[],
): Record<string, BudgetUnit> {
  return Object.fromEntries(
    buildUnits(categories).map((u) => [u.id, u]),
  );
}

/** Cari unit pencatatan dari ID. */
export function getUnit(
  categories: BudgetCategory[],
  unitId: string | null | undefined,
): BudgetUnit | undefined {
  if (!unitId) return undefined;
  for (const c of categories) {
    if (c.id === unitId) {
      return { id: c.id, name: c.name, categoryId: c.id, color: c.color };
    }
    const sub = c.subcategories.find((s) => s.id === unitId);
    if (sub) {
      return { id: sub.id, name: sub.name, categoryId: c.id, color: c.color };
    }
  }
  return undefined;
}

/** ID kategori/wadah induk dari sebuah unit/subkategori. */
export function getParentCategoryId(
  categories: BudgetCategory[],
  unitId: string,
): string {
  return getUnit(categories, unitId)?.categoryId ?? unitId;
}

/** Kategori berdasarkan ID. */
export function getCategory(
  categories: BudgetCategory[],
  categoryId: string,
): BudgetCategory | undefined {
  return categories.find((c) => c.id === categoryId);
}

/** Subkategori berdasarkan ID. */
export function getSubcategory(
  categories: BudgetCategory[],
  subcategoryId: string,
): BudgetSubcategory | undefined {
  for (const c of categories) {
    const sub = c.subcategories.find((s) => s.id === subcategoryId);
    if (sub) return sub;
  }
  return undefined;
}

/** Label tampilan unit + kategori induknya, mis. "GoJek · GoPay". */
export function getUnitFullLabel(
  categories: BudgetCategory[],
  unitId: string,
): string {
  const unit = getUnit(categories, unitId);
  if (!unit) return unitId;
  const cat = getCategory(categories, unit.categoryId);
  if (!cat || unit.id === cat.id) return unit.name;
  return `${unit.name} · ${cat.name}`;
}

/** Total alokasi seluruh wadah. */
export function totalAllocation(categories: BudgetCategory[]): number {
  return categories.reduce((acc, c) => acc + c.allocation, 0);
}

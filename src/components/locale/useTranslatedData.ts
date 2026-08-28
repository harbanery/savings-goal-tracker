"use client";

import { useMemo } from "react";
import type {
  BudgetCategory,
  BudgetSubcategory,
  Locale,
  LocaleText,
} from "@/models/types";
import { useLocale } from "./LocaleProvider";

/** Versi plain-string dari BudgetCategory untuk konsumsi UI. */
export interface ResolvedBudgetCategory {
  id: string;
  label: string;
  description: string;
  color: string;
  allocation: number;
  excludeFromAllocation?: boolean;
  subcategories?: BudgetSubcategory[];
}

/** Pilih teks sesuai locale (fallback ke id). */
export function pickText(text: LocaleText, locale: Locale): string {
  return text[locale] ?? text.id;
}

/**
 * Hook yang mengembalikan kategori dengan label sesuai locale aktif.
 * Membaca langsung dari CATEGORIES (single source of truth di categories.ts),
 * lalu memilih bahasa sesuai locale.
 */
export function useResolvedCategories(
  categories: BudgetCategory[],
): ResolvedBudgetCategory[] {
  const { locale } = useLocale();

  return useMemo(() => {
    const lang: Locale = locale ?? "id";
    return categories.map((c) => ({
      id: c.id,
      label: pickText(c.label, lang),
      description: pickText(c.description, lang),
      color: c.color,
      allocation: c.allocation,
      excludeFromAllocation: c.excludeFromAllocation,
      subcategories: c.subcategories,
    }));
  }, [categories, locale]);
}

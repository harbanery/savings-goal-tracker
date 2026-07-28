import type { Purchase as PrismaPurchase } from "@prisma/client";
import type { Purchase } from "@/models/types";

/** Konversi Decimal Prisma ke number (aman untuk RSC serialization). */
function toNumber(
  value: { toString(): string } | number | null | undefined,
): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Transformasi record Prisma ke model UI. */
export function toPurchase(record: PrismaPurchase): Purchase {
  return {
    id: record.id,
    name: record.name,
    categoryId: record.categoryId,
    amount: toNumber(record.amount),
    note: record.note,
    date: record.date.toISOString(),
  };
}

/** Transformasi list record Prisma ke list model UI (terbaru di depan). */
export function toPurchases(records: PrismaPurchase[]): Purchase[] {
  return records
    .map(toPurchase)
    .sort((a, b) => b.date.localeCompare(a.date));
}

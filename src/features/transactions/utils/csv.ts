import {
  buildUnits,
  getCategory,
} from "@/features/web/utils/categories";
import type {
  BudgetCategory,
  Transaction,
  TransactionInput,
  TransactionType,
} from "@/features/web/types";

/**
 * Utilitas CSV untuk template download & import (kompatibel Google Sheets).
 * Format kolom: Nama, Jenis, Wadah, Wadah Tujuan, Jumlah, Tanggal, Catatan
 *
 * - Jenis: EXPENSE | INCOME | TRANSFER (kosong = EXPENSE).
 * - Kolom Wadah menerima label penuh "Subkategori · Kategori", nama
 *   subkategori, nama kategori, atau ID.
 * - Wadah Tujuan hanya dipakai untuk TRANSFER.
 */

const CSV_HEADERS = [
  "Nama",
  "Jenis",
  "Wadah",
  "Wadah Tujuan",
  "Jumlah",
  "Tanggal",
  "Catatan",
];

const TYPE_TOKENS: Record<string, TransactionType> = {
  expense: "EXPENSE",
  pengeluaran: "EXPENSE",
  income: "INCOME",
  pemasukan: "INCOME",
  transfer: "TRANSFER",
};

/** Escape nilai CSV (quote bila ada koma, quote, atau newline). */
function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Label penuh unik "Subkategori · Kategori" dari ID unit/subkategori. */
function fullLabel(
  categories: BudgetCategory[],
  unitId: string | null | undefined,
): string {
  if (!unitId) return "";
  for (const c of categories) {
    if (c.id === unitId) return c.name;
    const sub = c.subcategories.find((s) => s.id === unitId);
    if (sub) return `${sub.name} · ${c.name}`;
  }
  return unitId;
}

/**
 * Generate CSV template dengan header + satu baris contoh.
 */
export function generateTemplateCsv(categories: BudgetCategory[]): string {
  const first = categories[0];
  const second = categories[1] ?? categories[0];
  const sampleRow = [
    escapeCsv("Contoh: Makan Siang"),
    "EXPENSE",
    escapeCsv(fullLabel(categories, first?.subcategories[0]?.id ?? first?.id)),
    "",
    "50000",
    "2026-10-25",
    escapeCsv("Makan di warteg"),
  ];
  const sampleTransfer = [
    escapeCsv("Contoh: Pindah saldo"),
    "TRANSFER",
    escapeCsv(first?.name ?? ""),
    escapeCsv(second?.name ?? ""),
    "100000",
    "2026-10-26",
    "",
  ];
  return [
    CSV_HEADERS.join(","),
    sampleRow.join(","),
    sampleTransfer.join(","),
  ].join("\n");
}

/** Generate CSV dari daftar transaksi untuk export. */
export function generateTransactionsCsv(
  transactions: Transaction[],
  categories: BudgetCategory[],
): string {
  const rows = transactions.map((tr) => {
    const date = tr.date.split("T")[0]; // YYYY-MM-DD
    return [
      escapeCsv(tr.name),
      tr.type,
      escapeCsv(fullLabel(categories, tr.subcategoryId ?? tr.categoryId)),
      escapeCsv(
        tr.toCategoryId
          ? (getCategory(categories, tr.toCategoryId)?.name ?? tr.toCategoryId)
          : "",
      ),
      String(tr.amount),
      date,
      escapeCsv(tr.note),
    ].join(",");
  });
  return [CSV_HEADERS.join(","), ...rows].join("\n");
}

/**
 * Cocokkan referensi teks (case-insensitive) menjadi ID kategori + subkategori.
 * Prioritas: ID -> label penuh "Sub · Kategori" -> nama subkategori ->
 * nama kategori (hanya kategori tanpa subkategori).
 */
function matchCategory(
  categories: BudgetCategory[],
  ref: string,
): { categoryId: string; subcategoryId: string | null } | undefined {
  const t = ref.trim().toLowerCase();
  if (!t) return undefined;

  for (const c of categories) {
    if (c.id.toLowerCase() === t) {
      return { categoryId: c.id, subcategoryId: null };
    }
    for (const s of c.subcategories) {
      if (s.id.toLowerCase() === t) {
        return { categoryId: c.id, subcategoryId: s.id };
      }
    }
  }

  // Label penuh "Sub · Kategori" (paling spesifik dulu).
  for (const c of categories) {
    for (const s of c.subcategories) {
      if (`${s.name} · ${c.name}`.toLowerCase() === t) {
        return { categoryId: c.id, subcategoryId: s.id };
      }
    }
  }
  // Nama subkategori saja.
  for (const c of categories) {
    for (const s of c.subcategories) {
      if (s.name.toLowerCase() === t) {
        return { categoryId: c.id, subcategoryId: s.id };
      }
    }
  }
  // Nama kategori (kategori tanpa subkategori; kategori bersubkategori
  // dicatat di level wadah).
  for (const c of categories) {
    if (c.name.toLowerCase() === t) {
      return { categoryId: c.id, subcategoryId: null };
    }
  }
  return undefined;
}

/**
 * Parse CSV teks menjadi daftar TransactionInput.
 * Baris dengan error dilewati dan dilaporkan.
 */
export function parseCsvToTransactions(
  csv: string,
  categories: BudgetCategory[],
): { valid: TransactionInput[]; errors: string[] } {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length === 0) {
    return { valid: [], errors: ["File kosong"] };
  }

  const errors: string[] = [];
  const valid: TransactionInput[] = [];

  // Cari baris header: skip bila baris pertama mengandung "Nama".
  const startIndex = /nama/i.test(lines[0]) ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const rowNum = i + 1;

    const cols = parseCsvLine(line);
    if (cols.length < 4) {
      errors.push(`Baris ${rowNum}: kolom tidak lengkap (butuh minimal 4)`);
      continue;
    }

    // Dukung format lama (tanpa kolom Jenis/Wadah Tujuan) dan baru.
    const isNewFormat = /jenis/i.test(lines[startIndex - 1] ?? "");
    let name: string, typeToken: string, catRef: string, toRef: string,
      amountStr: string, dateStr: string, note: string;
    if (isNewFormat) {
      [name, typeToken, catRef, toRef, amountStr, dateStr, note] = cols;
    } else {
      // Legacy: Nama, Subkategori, Jumlah, Tanggal, Catatan
      [name, catRef, amountStr, dateStr, note] = cols;
      typeToken = "EXPENSE";
      toRef = "";
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      errors.push(`Baris ${rowNum}: nama kosong`);
      continue;
    }

    const type = TYPE_TOKENS[typeToken.trim().toLowerCase()] ?? "EXPENSE";

    const from = matchCategory(categories, catRef);
    if (!from) {
      errors.push(`Baris ${rowNum}: wadah "${catRef}" tidak ditemukan`);
      continue;
    }

    let toCategoryId: string | null = null;
    if (type === "TRANSFER") {
      const to = matchCategory(categories, toRef);
      if (!to) {
        errors.push(`Baris ${rowNum}: wadah tujuan "${toRef}" tidak ditemukan`);
        continue;
      }
      if (to.categoryId === from.categoryId) {
        errors.push(`Baris ${rowNum}: wadah sumber & tujuan sama`);
        continue;
      }
      toCategoryId = to.categoryId;
    }

    const amount = Number(amountStr.replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push(`Baris ${rowNum}: jumlah "${amountStr}" tidak valid`);
      continue;
    }

    const parsedDate = parseDate(dateStr.trim());
    if (!parsedDate) {
      errors.push(`Baris ${rowNum}: tanggal "${dateStr}" tidak valid`);
      continue;
    }

    valid.push({
      type,
      name: trimmedName,
      categoryId: from.categoryId,
      subcategoryId: from.subcategoryId,
      toCategoryId,
      amount: Math.round(amount),
      note: (note ?? "").trim(),
      date: parsedDate.toISOString(),
    });
  }

  return { valid, errors };
}

/** Parse satu baris CSV yang mungkin mengandung quoted values. */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}

/** Parse tanggal dari format YYYY-MM-DD atau DD/MM/YYYY. */
function parseDate(str: string): Date | null {
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const d = new Date(
      Number(isoMatch[1]),
      Number(isoMatch[2]) - 1,
      Number(isoMatch[3]),
    );
    if (!Number.isNaN(d.getTime())) return d;
  }
  const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const d = new Date(
      Number(dmyMatch[3]),
      Number(dmyMatch[2]) - 1,
      Number(dmyMatch[1]),
    );
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

/** Re-export untuk pemakaian UI (daftar unit dari kategori user). */
export { buildUnits };

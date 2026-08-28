import {
  CATEGORIES,
  CATEGORY_MAP,
  LEGACY_ALIASES,
  UNIT_MAP,
  UNITS,
  getUnit,
  resolveUnitId,
} from "@/models/categories";
import type { Locale, Purchase, PurchaseInput } from "@/models/types";

/**
 * Utilitas CSV untuk template download & import (kompatibel Google Sheets).
 * Format kolom: Nama, Subkategori, Jumlah, Tanggal, Catatan
 *
 * Kolom Subkategori menerima (urutan prioritas): ID unit, label penuh
 * "Subkategori · Kategori", label/ID kategori lama (dipetakan otomatis),
 * label singkat subkategori, lalu label/ID kategori baru.
 */

const CSV_HEADERS = ["Nama", "Subkategori", "Jumlah", "Tanggal", "Catatan"];

/** Escape nilai CSV (quote bila ada koma, quote, atau newline). */
function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Label penuh unik "Subkategori · Kategori", mis. "Belanja · Livin". */
function fullLabel(unitId: string, locale: Locale = "id"): string {
  const unit = getUnit(unitId);
  if (!unit) return unitId;
  const cat = CATEGORY_MAP[unit.categoryId];
  if (!cat || unit.id === cat.id) return unit.label[locale] ?? unit.label.id;
  return `${unit.label[locale] ?? unit.label.id} · ${cat.label[locale] ?? cat.label.id}`;
}

/**
 * Generate CSV template dengan header + satu baris contoh.
 * Subkategori diisi dengan label penuh (bukan ID) agar user-friendly.
 */
export function generateTemplateCsv(): string {
  const sampleRow = [
    escapeCsv("Contoh: Makan Siang"),
    escapeCsv(fullLabel(UNITS[0].id)),
    "50000",
    "2026-07-25",
    escapeCsv("Makan di warteg"),
  ];
  return [CSV_HEADERS.join(","), sampleRow.join(",")].join("\n");
}

/** Generate CSV dari daftar pembelian untuk export. */
export function generatePurchasesCsv(purchases: Purchase[]): string {
  const rows = purchases.map((p) => {
    const unit = getUnit(p.categoryId);
    // Label penuh agar unik antar subkategori bernama sama (mis. "Belanja").
    const unitLabel = unit ? fullLabel(unit.id) : p.categoryId;
    const date = p.date.split("T")[0]; // YYYY-MM-DD
    return [
      escapeCsv(p.name),
      escapeCsv(unitLabel),
      String(p.amount),
      date,
      escapeCsv(p.note),
    ].join(",");
  });
  return [CSV_HEADERS.join(","), ...rows].join("\n");
}

/**
 * Cocokkan referensi teks (case-insensitive) menjadi ID unit.
 * Prioritas: ID unit -> label penuh "Unit · Kategori" -> alias kategori lama
 * (ID & label) -> label singkat unit -> label/ID kategori baru.
 */
function matchUnit(ref: string): string | undefined {
  const t = ref.trim().toLowerCase();
  if (!t) return undefined;
  // 1. ID unit baru, atau label penuh "Subkategori · Kategori" (unik).
  const byId = UNITS.find((u) => u.id.toLowerCase() === t);
  if (byId) return byId.id;
  const byFull = UNITS.find((u) => fullLabel(u.id).toLowerCase() === t);
  if (byFull) return byFull.id;
  // 2. Alias lama: ID kategori lama + label lama (mis. "Belanja" standalone
  //    -> ShopeePay/Lainnya). Naik di atas label singkat agar data ekspor
  //    lama terpetakan ke unit penggantinya.
  if (LEGACY_ALIASES[t] && UNIT_MAP[LEGACY_ALIASES[t]]) {
    return LEGACY_ALIASES[t];
  }
  // 3. Label singkat unit (id/en). Label ganda antar wadah (mis. "Belanja"
  //    di Livin & ShopeePay) menang ke kemunculan pertama.
  const byLabel = UNITS.find(
    (u) =>
      u.label.id.toLowerCase() === t ||
      u.label.en.toLowerCase() === t,
  );
  if (byLabel) return byLabel.id;
  // 4. Label/ID kategori baru: valid hanya bila kategori tanpa subkategori
  //    atau punya alias legacy (mis. "gopay" -> "gopay-ojol").
  const cat = CATEGORIES.find(
    (c) =>
      c.id.toLowerCase() === t ||
      c.label.id.toLowerCase() === t ||
      c.label.en.toLowerCase() === t,
  );
  if (cat) {
    const resolved = resolveUnitId(cat.id);
    if (UNIT_MAP[resolved]) return resolved;
  }
  return undefined;
}

/**
 * Parse CSV teks menjadi daftar PurchaseInput.
 * Subkategori dicocokkan berdasarkan label (case-insensitive) atau ID;
 * kategori lama tetap diterima dan dipetakan otomatis.
 * Baris dengan error dilewati dan dilaporkan.
 */
export function parseCsvToPurchases(
  csv: string,
): { valid: PurchaseInput[]; errors: string[] } {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length === 0) {
    return { valid: [], errors: ["File kosong"] };
  }

  const errors: string[] = [];
  const valid: PurchaseInput[] = [];

  // Cari baris header: skip bila baris pertama mengandung "Nama"
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

    const [name, catLabel, amountStr, dateStr, note] = cols;
    const trimmedName = name.trim();
    if (!trimmedName) {
      errors.push(`Baris ${rowNum}: nama kosong`);
      continue;
    }

    // Cocokkan subkategori berdasarkan label (kedua bahasa) atau ID,
    // termasuk kategori lama (legacy-aware).
    const unitId = matchUnit(catLabel);
    if (!unitId) {
      errors.push(
        `Baris ${rowNum}: subkategori "${catLabel}" tidak ditemukan`,
      );
      continue;
    }

    const amount = Number(amountStr.replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push(`Baris ${rowNum}: jumlah "${amountStr}" tidak valid`);
      continue;
    }

    // Parse tanggal: support YYYY-MM-DD atau DD/MM/YYYY
    const parsedDate = parseDate(dateStr.trim());
    if (!parsedDate) {
      errors.push(`Baris ${rowNum}: tanggal "${dateStr}" tidak valid`);
      continue;
    }

    valid.push({
      name: trimmedName,
      categoryId: unitId,
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
  // YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const d = new Date(
      Number(isoMatch[1]),
      Number(isoMatch[2]) - 1,
      Number(isoMatch[3]),
    );
    if (!Number.isNaN(d.getTime())) return d;
  }
  // DD/MM/YYYY
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

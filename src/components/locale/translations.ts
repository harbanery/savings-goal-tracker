import type { Locale } from "@/models/types";

/** Dictionary type: flat key -> value per locale. */
export type TranslationDict = Record<string, string>;

export const LOCALES: Locale[] = ["id", "en"];

export const DEFAULT_LOCALE: Locale = "id";

export const LOCALE_LABELS: Record<Locale, string> = {
  id: "Bahasa Indonesia",
  en: "English",
};

const id: TranslationDict = {
  // Common
  "common.cancel": "Batal",
  "common.delete": "Hapus",
  "common.save": "Simpan",

  // App / Dashboard
  "app.title": "Savings Goal Tracker",
  "app.description": "Pantau pengeluaran bulanan dengan sistem wadah.",
  "app.cycleLabel": "Siklus {label}",
  "app.rangeSeparator": "s/d",
  "app.tabCharts": "Grafik",
  "app.tabList": "Daftar",
  "app.overLimitTitle": "Melebihi Limit Pengeluaran!",
  "app.overLimitDesc":
    "Pengeluaran sudah {spent}, melebihi limit {limit}. Selisih: {diff}.",

  // Stats
  "stats.initialBalance": "Saldo",
  "stats.totalSpent": "Total Pengeluaran",
  "stats.limitRemaining": "Sisa Limit",

  // Table
  "table.colPurchase": "Pembelian",
  "table.colCategory": "Kategori",
  "table.colAmount": "Jumlah",
  "table.colDate": "Tanggal",
  "table.colAction": "Aksi",
  "table.editAria": "Edit pembelian",
  "table.deleteAria": "Hapus pembelian",
  "table.deleteConfirm": "Hapus pembelian ini?",
  "table.selected": "{n} dipilih",
  "table.deleteBulkConfirm": "Hapus {n} pembelian?",
  "table.addPurchase": "Tambah Pembelian",
  "table.empty": "Belum ada pembelian di siklus ini",

  // Form
  "form.editTitle": "Edit Pembelian",
  "form.addTitle": "Tambah Pembelian",
  "form.name": "Nama Pembelian",
  "form.nameRequired": "Nama pembelian wajib diisi",
  "form.nameWhitespace": "Nama tidak boleh hanya spasi",
  "form.namePlaceholder": "Contoh: Makan siang, Bensin, Spotify",
  "form.category": "Kategori / Wadah",
  "form.categoryRequired": "Kategori wajib dipilih",
  "form.categoryPlaceholder": "Pilih kategori",
  "form.amount": "Jumlah Biaya",
  "form.amountRequired": "Jumlah wajib diisi",
  "form.amountPositive": "Jumlah harus lebih dari 0",
  "form.date": "Tanggal",
  "form.dateWithCycle": "Tanggal (Siklus: {label})",
  "form.dateRequired": "Tanggal wajib diisi",
  "form.datePlaceholder": "Pilih tanggal",
  "form.note": "Catatan (opsional)",
  "form.notePlaceholder": "Catatan tambahan...",
  "form.saveChanges": "Simpan Perubahan",

  // Breakdown
  "breakdown.title": "Alokasi Wadah",
  "breakdown.noAllocation": "(tanpa alokasi)",
  "breakdown.purchases": "{n}x pembelian",
  "breakdown.over": "Lebih ",
  "breakdown.remaining": "Sisa ",

  // Charts
  "chart.balanceTitle": "Saldo: Pengeluaran vs Sisa",
  "chart.spending": "Pengeluaran",
  "chart.remaining": "Sisa Saldo",
  "chart.emptySpending": "Belum ada pengeluaran",
  "chart.emptyData": "Belum ada data",
  "chart.allocationTitle": "Total Pengeluaran per Bulan",
  "chart.categoryTitle": "Pengeluaran per Kategori",
  "chart.cumulativeTitle": "Tabungan Kumulatif",
  "chart.comparisonTitle": "Tabungan Target vs Aktual",
  "chart.expectedSavings": "Tabungan Target",
  "chart.actualSavings": "Tabungan Aktual",
  "chart.expectedCumulative": "Kumulatif Target",
  "chart.actualCumulative": "Kumulatif Aktual",

  // Import / Export
  "io.template": "Template",
  "io.export": "Export",
  "io.import": "Import",
  "io.templateTooltip": "Download template CSV (untuk Google Sheets)",
  "io.exportTooltip": "Export pembelian ke CSV",
  "io.importTooltip": "Import CSV dari Google Sheets",
  "io.noDataExport": "Belum ada pembelian untuk diexport.",
  "io.fileEmpty": "File kosong atau tidak terbaca.",
  "io.imported": "{n} pembelian berhasil diimport.",
  "io.importedPartial": "{n} pembelian berhasil diimport. {m} baris dilewati.",
  "io.importNone": "Tidak ada pembelian yang berhasil diimport.",
  "io.importFail": "Gagal import: {msg}",
  "io.noValid": "Tidak ada baris valid. {n} error: {first}",

  // Notification
  "notif.permissionDenied":
    "Izin notifikasi ditolak. Aktifkan di pengaturan browser.",
  "notif.enabled":
    "Notifikasi diaktifkan! Anda akan mendapat pengingat pengeluaran & insight tabungan.",
  "notif.enableFailed": "Gagal mengaktifkan notifikasi.",
  "notif.disabled": "Notifikasi dinonaktifkan.",
  "notif.disableFailed": "Gagal menonaktifkan notifikasi.",
  "notif.activeTooltip": "Notifikasi aktif. Klik untuk menonaktifkan.",
  "notif.inactiveTooltip":
    "Aktifkan notifikasi untuk pengingat pengeluaran harian & insight tabungan mingguan.",

  // Clock
  "clock.loading": "Memuat...",
  "clock.ariaTime": "Waktu sekarang {time}, {date}",

  // Theme
  "theme.light": "Mode Terang",
  "theme.dark": "Mode Gelap",
  "theme.enableLight": "Aktifkan mode terang",
  "theme.enableDark": "Aktifkan mode gelap",

  // Language
  "lang.toggleAria": "Ganti bahasa",
};

const en: TranslationDict = {
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.save": "Save",

  "app.title": "Savings Goal Tracker",
  "app.description": "Track monthly spending with an envelope system.",
  "app.cycleLabel": "{label}",
  "app.rangeSeparator": "to",
  "app.tabCharts": "Charts",
  "app.tabList": "List",
  "app.overLimitTitle": "Spending Limit Exceeded!",
  "app.overLimitDesc":
    "Spending is {spent}, exceeding the limit of {limit}. Difference: {diff}.",

  "stats.initialBalance": "Balance",
  "stats.totalSpent": "Total Spending",
  "stats.limitRemaining": "Limit Remaining",

  "table.colPurchase": "Purchase",
  "table.colCategory": "Category",
  "table.colAmount": "Amount",
  "table.colDate": "Date",
  "table.colAction": "Action",
  "table.editAria": "Edit purchase",
  "table.deleteAria": "Delete purchase",
  "table.deleteConfirm": "Delete this purchase?",
  "table.selected": "{n} selected",
  "table.deleteBulkConfirm": "Delete {n} purchases?",
  "table.addPurchase": "Add Purchase",
  "table.empty": "No purchases in this cycle",

  "form.editTitle": "Edit Purchase",
  "form.addTitle": "Add Purchase",
  "form.name": "Purchase Name",
  "form.nameRequired": "Purchase name is required",
  "form.nameWhitespace": "Name cannot be only spaces",
  "form.namePlaceholder": "e.g. Lunch, Gas, Spotify",
  "form.category": "Category / Envelope",
  "form.categoryRequired": "Category is required",
  "form.categoryPlaceholder": "Select category",
  "form.amount": "Amount",
  "form.amountRequired": "Amount is required",
  "form.amountPositive": "Amount must be greater than 0",
  "form.date": "Date",
  "form.dateWithCycle": "Date (Cycle: {label})",
  "form.dateRequired": "Date is required",
  "form.datePlaceholder": "Select date",
  "form.note": "Note (optional)",
  "form.notePlaceholder": "Additional note...",
  "form.saveChanges": "Save Changes",

  "breakdown.title": "Envelope Allocation",
  "breakdown.noAllocation": "(no allocation)",
  "breakdown.purchases": "{n}x purchases",
  "breakdown.over": "Over ",
  "breakdown.remaining": "Left ",

  "chart.balanceTitle": "Balance: Spending vs Remaining",
  "chart.spending": "Spending",
  "chart.remaining": "Remaining Balance",
  "chart.emptySpending": "No spending yet",
  "chart.emptyData": "No data yet",
  "chart.allocationTitle": "Total Spending per Month",
  "chart.categoryTitle": "Spending by Category",
  "chart.cumulativeTitle": "Cumulative Savings",
  "chart.comparisonTitle": "Expected vs Actual Savings",
  "chart.expectedSavings": "Expected Savings",
  "chart.actualSavings": "Actual Savings",
  "chart.expectedCumulative": "Expected Cumulative",
  "chart.actualCumulative": "Actual Cumulative",

  "io.template": "Template",
  "io.export": "Export",
  "io.import": "Import",
  "io.templateTooltip": "Download CSV template (for Google Sheets)",
  "io.exportTooltip": "Export purchases to CSV",
  "io.importTooltip": "Import CSV from Google Sheets",
  "io.noDataExport": "No purchases to export.",
  "io.fileEmpty": "File is empty or unreadable.",
  "io.imported": "{n} purchases imported successfully.",
  "io.importedPartial": "{n} purchases imported. {m} rows skipped.",
  "io.importNone": "No purchases were imported.",
  "io.importFail": "Import failed: {msg}",
  "io.noValid": "No valid rows. {n} errors: {first}",

  "notif.permissionDenied":
    "Notification permission denied. Enable it in browser settings.",
  "notif.enabled":
    "Notifications enabled! You'll receive spending reminders & savings insights.",
  "notif.enableFailed": "Failed to enable notifications.",
  "notif.disabled": "Notifications disabled.",
  "notif.disableFailed": "Failed to disable notifications.",
  "notif.activeTooltip": "Notifications active. Click to disable.",
  "notif.inactiveTooltip":
    "Enable notifications for daily spending reminders & weekly savings insights.",

  "clock.loading": "Loading...",
  "clock.ariaTime": "Current time {time}, {date}",

  "theme.light": "Light Mode",
  "theme.dark": "Dark Mode",
  "theme.enableLight": "Enable light mode",
  "theme.enableDark": "Enable dark mode",

  "lang.toggleAria": "Switch language",
};

export const TRANSLATIONS: Record<Locale, TranslationDict> = { id, en };

export function translate(
  dict: TranslationDict,
  key: string,
  params?: Record<string, string | number>,
): string {
  let str = dict[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return str;
}

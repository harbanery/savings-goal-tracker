import type { Locale } from "@/types/locale";

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
  "common.close": "Tutup",

  // Not Found / Error page
  "notfound.desc": "Halaman yang Anda cari tidak tersedia atau sudah dipindahkan.",
  "notfound.back": "Kembali ke Beranda",
  "error.title": "Terjadi Kesalahan",
  "error.fallback": "Terjadi kesalahan yang tidak terduga.",
  "error.retry": "Coba Lagi",


  // App / Dashboard
  "app.title": "Savings Goal Tracker",
  "app.description": "Pantau pengeluaran bulanan dengan sistem wadah.",
  "app.cycleLabel": "Siklus {label}",
  "app.rangeSeparator": "s/d",
  "app.tabCharts": "Grafik",
  "app.tabFacts": "Insight",
  "app.tabRecords": "Catatan",
  "app.overLimitTitle": "Melebihi Limit Pengeluaran!",
  "app.overLimitDesc":
    "Pengeluaran sudah {spent}, melebihi limit {limit}. Selisih: {diff}.",


  // Stats
  "stats.initialBalance": "Saldo",
  "stats.totalSpent": "Total Pengeluaran",
  "stats.limitRemaining": "Sisa Limit",

  // Table
  "table.colPurchase": "Transaksi",
  "table.colSubcategory": "Subkategori",
  "table.colAmount": "Jumlah",
  "table.colDate": "Tanggal",
  "table.colAction": "Aksi",
  "table.editAria": "Edit transaksi",
  "table.deleteAria": "Hapus transaksi",
  "table.deleteConfirm": "Hapus transaksi ini?",
  "table.selected": "{n} dipilih",
  "table.deleteBulkConfirm": "Hapus {n} transaksi?",
  "table.addPurchase": "Tambah Transaksi",
  "table.empty": "Belum ada transaksi di siklus ini",
  "table.searchPlaceholder": "Cari nama transaksi...",
  "table.filterSubcategoryPlaceholder": "Semua Subkategori",
  "table.filterResult": "Menampilkan {shown} dari {total}",
  "table.noMatch": "Tidak ada transaksi yang cocok",

  // Form
  "form.editTitle": "Edit Transaksi",
  "form.addTitle": "Tambah Transaksi",
  "form.name": "Nama Transaksi",
  "form.nameRequired": "Nama transaksi wajib diisi",
  "form.nameWhitespace": "Nama tidak boleh hanya spasi",
  "form.namePlaceholder": "Contoh: Makan siang, Gaji, Transfer",
  "form.subcategory": "Subkategori / Wadah",
  "form.subcategoryRequired": "Subkategori wajib dipilih",
  "form.subcategoryPlaceholder": "Pilih subkategori",
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
  "chart.dailySpending": "Pengeluaran Harian",
  "chart.dailySpendingTitle": "Pengeluaran Harian per Tanggal",

  // Import / Export
  "io.template": "Template",
  "io.export": "Export",
  "io.import": "Import",
  "io.templateTooltip": "Download template CSV (untuk Google Sheets)",
  "io.exportTooltip": "Export transaksi ke CSV",
  "io.importTooltip": "Import CSV dari Google Sheets",
  "io.noDataExport": "Belum ada transaksi untuk diexport.",
  "io.fileEmpty": "File kosong atau tidak terbaca.",
  "io.imported": "{n} transaksi berhasil diimport.",
  "io.importedPartial": "{n} transaksi berhasil diimport. {m} baris dilewati.",
  "io.importNone": "Tidak ada transaksi yang berhasil diimport.",
  "io.importFail": "Gagal import: {msg}",
  "io.noValid": "Tidak ada baris valid. {n} error: {first}",

  // Notification
  "notif.permissionDenied":
    "Izin notifikasi ditolak. Aktifkan di pengaturan browser.",
  "notif.enabled":
    "Notifikasi diaktifkan! Anda akan mendapat pengingat pengeluaran harian.",
  "notif.enableFailed": "Gagal mengaktifkan notifikasi.",
  "notif.disabled": "Notifikasi dinonaktifkan.",
  "notif.disableFailed": "Gagal menonaktifkan notifikasi.",
  "notif.activeTooltip": "Notifikasi aktif. Klik untuk menonaktifkan.",
  "notif.inactiveTooltip":
    "Aktifkan notifikasi untuk pengingat pengeluaran harian.",

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

  // PWA Install Prompt
  "pwa.installTitle": "Pasang Aplikasi",
  "pwa.installDesc": "Pasang aplikasi ini ke perangkat Anda untuk akses cepat.",
  "pwa.installBtn": "Pasang",
  "pwa.laterBtn": "Nanti Saja",
  "pwa.iosHint":
    "Untuk memasang di iOS: ketuk tombol Share, lalu pilih Add to Home Screen.",

  // Insights / Analitik
  "insights.topKeywordsTitle": "Top 10 Keyword Transaksi",
  "insights.empty": "Belum ada data",
  "insights.keywordStat": "{count}x transaksi — total {total}",
  "insights.wadahTooltip": "Muncul di {n} wadah alokasi",
  "insights.keywordFreqTooltip": "Frekuensi: {val}x",

  // Dev / Development (hanya tampil saat NODE_ENV === "development")
  "dev.title": "Tes Notifikasi",
  "dev.trackingNudgeBtn": "Tracking Nudge",
  "dev.trackingNudgeTooltip": "Kirim push: pengingat belum mencatat",
  "dev.categorySpotlightBtn": "Category Spotlight",
  "dev.categorySpotlightTooltip": "Kirim push: sorotan wadah boros mingguan",
  "dev.cycleResetBtn": "Cycle Reset",
  "dev.cycleResetTooltip": "Kirim push: pengingat reset siklus H-1",
  "dev.newCycleKickoffBtn": "New Cycle Kickoff",
  "dev.newCycleKickoffTooltip":
    "Kirim email: kickoff siklus baru + saran realokasi",
  "dev.monthlySummaryBtn": "Monthly Summary",
  "dev.monthlySummaryTooltip": "Kirim email: rekap akhir siklus",
  "dev.csvExportBtn": "CSV Export Reminder",
  "dev.csvExportTooltip": "Kirim email: pengingat backup data",
  "dev.quarterlyTrendBtn": "Quarterly Trend",
  "dev.quarterlyTrendTooltip": "Kirim email: laporan tren tabungan triwulanan",
  "dev.yearlyRecapBtn": "Yearly Recap",
  "dev.yearlyRecapTooltip": "Kirim email: rekap akhir tahunan + top 3 wadah terboros",
  "dev.pushSuccess": "Notifikasi terkirim ({val} subscriber).",
  "dev.emailSuccess": "Email berhasil dikirim.",
  "dev.skipped": "Notifikasi dilewati — kondisi tidak terpenuhi.",
  "dev.pushFailed": "Gagal mengirim notifikasi.",

  // Menu / Navigasi (Keuangan = wadah, Kebutuhan = subkategori wadah,
  // Budget, Target — halaman terpisah)
  "menu.dashboard": "Dashboard",
  "menu.transactions": "Transaksi",
  "menu.finance": "Keuangan",
  "menu.needs": "Kebutuhan",
  "menu.budget": "Budget",
  "menu.target": "Target",
  "menu.reports": "Laporan",
  "menu.open": "Buka menu",

  // Navigasi siklus (navbar)
  "app.cyclePicker": "Pilih siklus bulan",

  // Auth / Login
  "auth.logout": "Keluar",
  "auth.loginSubtitle": "Pantau pengeluaran bulanan dengan sistem wadah.",
  "auth.loginHint":
    "Login dengan Google — data keuangan Anda tersimpan aman per akun.",
  "auth.googleBtn": "Login dengan Google",
  "auth.googleNotConfigured":
    "Google Auth belum dikonfigurasi (isi GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET)",
  "auth.errorState": "Sesi login kedaluwarsa. Coba lagi.",
  "auth.errorExchange": "Gagal memverifikasi akun Google. Coba lagi.",
  "auth.errorUnverified": "Email Google Anda belum terverifikasi.",
  "auth.errorGoogle": "Login Google dibatalkan atau gagal.",
  "auth.errorDefault": "Gagal login. Coba lagi.",

  // Form multi-tipe
  "form.typeExpense": "Pengeluaran",
  "form.typeIncome": "Pemasukan",
  "form.typeTransfer": "Transfer",
  "form.fromUnit": "Dari Wadah",
  "form.toUnit": "Ke Wadah",
  "form.toCategory": "Ke Wadah Tujuan",
  "form.toCategoryRequired": "Wadah tujuan wajib dipilih",
  "form.toCategoryPlaceholder": "Pilih wadah tujuan",

  // Stats tambahan
  "stats.netSavings": "Saldo Bersih",
  "stats.totalIncome": "Total Pemasukan",
  "stats.cashFlow": "Cash Flow",

  // Tabel transaksi
  "table.colType": "Jenis",
  "table.filterAll": "Semua",
  "table.filterAllUnits": "Semua Wadah",

  // Settings (kini tinggal label yang dipakai halaman Budget)
  "settings.save": "Simpan",
  "settings.saved": "Perubahan tersimpan",
  "settings.saveFailed": "Gagal menyimpan perubahan",
  "settings.cycleStartDay": "Tanggal Mulai Siklus",
  "settings.cycleStartDayHint":
    "Tanggal mulai siklus setiap bulan (1-28), berlaku per akun.",
  "settings.categoriesEmpty":
    "Belum ada wadah. Tambahkan wadah pertama Anda untuk mulai mencatat transaksi.",
  "settings.addCategory": "Tambah Wadah",
  "settings.editCategory": "Edit Wadah",
  "settings.deleteCategoryConfirm":
    "Hapus wadah ini? Wadah yang masih dipakai transaksi tidak bisa dihapus.",
  "settings.deleteSubConfirm":
    "Hapus subkategori ini? Subkategori yang masih dipakai transaksi tidak bisa dihapus.",
  "settings.categoryName": "Nama Wadah",
  "settings.categoryColor": "Warna",
  "settings.colorPresets": "Warna Standar",
  "settings.addSubcategory": "Tambah Subkategori",
  "settings.editSubcategory": "Edit Subkategori",
  "settings.subcategoryName": "Nama Subkategori",

  // Kategori (table wadah & subkategori dipisah)
  "categories.wadahTitle": "Wadah",
  "categories.subTitle": "Subkategori",
  "categories.subEmpty": "Belum ada subkategori. Tambahkan dari wadah yang tersedia.",
  "categories.subCount": "{n} subkategori",

  // Keuangan: halaman wadah / Budget / Target
  "finance.walletType": "Jenis Dompet",
  "finance.walletBank": "Bank",
  "finance.walletEwallet": "E-Wallet",
  "finance.walletCash": "Cash",
  "finance.notAllocatedHint":
    "Wadah belum bisa pengeluaran/transfer. Catat pemasukan atau terima transfer masuk terlebih dulu — alokasi tidak bisa diisi manual.",
  "finance.walletFunds": "Dana",
  "finance.walletUsed": "Terpakai",
  "finance.walletRemainingLabel": "Sisa ",
  "finance.walletOver": "Lebih ",
  "finance.allocationTotal": "Total Alokasi",
  "finance.budgetIncome": "Pemasukan Siklus Ini",
  "finance.budgetProtected": "Tabungan Dilindungi",
  "finance.budgetAllocatable": "Bisa Dialokasikan",
  "finance.budgetSpent": "Terpakai",
  "finance.budgetSettingTitle": "Atur Tabungan per Siklus",
  "finance.budgetSettingHint":
    "Nominal tabungan yang tidak boleh tersentuh pengeluaran pada setiap siklus. Pengeluaran yang mencoba melampaui batas alokasi akan diminta konfirmasi terpaksa sebelum tersimpan.",
  "finance.budgetOverTitle": "Alokasi Terlampaui",
  "finance.budgetOverDesc":
    "Pengeluaran {spent} sudah melebihi batas alokasi {limit} dan menyentuh tabungan dilindungi.",
  "finance.targetsTitle": "Target Tabungan",
  "finance.addTarget": "Tambah Target",
  "finance.editTarget": "Edit Target",
  "finance.targetName": "Nama Target",
  "finance.targetNameHint": "Contoh: Beli HP, Tabungan 1 Tahun",
  "finance.targetAmount": "Nilai Target",
  "finance.targetDeadlineLabel": "Batas Waktu",
  "finance.targetDeadline": "Batas Waktu (opsional)",
  "finance.targetNote": "Catatan (opsional)",
  "finance.targetScope": "Sumber Dana",
  "finance.targetScopeAll": "Semua Wadah",
  "finance.targetScopeCustom": "Wadah Tertentu",
  "finance.targetScopeCount": "{n} wadah",
  "finance.targetScopeHint":
    "Dana terkumpul dihitung otomatis dari tabungan bersih seluruh siklus pada wadah terpilih (pemasukan + transfer masuk − pengeluaran − transfer keluar).",
  "finance.targetAutoHint":
    "Dana terkumpul dihitung otomatis dari tabungan seluruh siklus — tanpa tambah dana manual.",
  "finance.deleteTargetConfirm": "Hapus target ini?",
  "finance.targetsEmpty":
    "Belum ada target. Buat target pertama Anda, mis. beli HP atau tabungan 1 tahun.",
  "finance.targetProgress": "{saved} dari {target}",

  // Transaksi berulang & proteksi tabungan
  "form.repeatLabel": "Pengulangan",
  "form.repeatOnce": "Sekali",
  "form.repeatMonthly": "Setiap Bulan",
  "form.recurHint":
    "Otomatis tercatat setiap tanggal {n} bulan berikutnya — tanpa perlu tambah transaksi lagi.",
  "form.protectionTitle": "Menyentuh Tabungan Dilindungi",
  "form.protectionDesc":
    "Pengeluaran akan menjadi {projected}, melebihi batas alokasi {limit} dan menyentuh tabungan yang Anda lindungi. Lanjutkan terpaksa?",
  "form.protectionConfirm": "Lanjutkan Terpaksa",
  "form.walletLimitTitle": "Dana Wadah Tidak Cukup",
  "form.walletLimitDesc":
    "Total pengeluaran/transfer dari wadah {wallet} akan menjadi {projected}, melebihi dana tersedia {limit}. Catat pemasukan atau terima transfer masuk ke wadah tersebut terlebih dulu.",
  "transactions.recurringTitle": "Transaksi Berulang",
  "transactions.recurringEvery": "tiap tanggal {n}",
  "transactions.recurringEmpty": "Belum ada transaksi berulang.",
  "transactions.recurringTag": "Berulang",
  "transactions.recurringToggle": "Aktifkan/nonaktifkan aturan",
  "transactions.deleteRecurringConfirm":
    "Hapus aturan berulang ini? Transaksi yang sudah tercatat tetap ada.",
  "transactions.viewAria": "Pilih tampilan tabel transaksi",

  // Kebutuhan: subkategori wadah (dipindah dari halaman Keuangan)
  "needs.title": "Kebutuhan",
  "needs.subcategories": "Subkategori",
  "needs.subEmptyInline": "Belum ada subkategori",
  "needs.subCount": "{n} subkategori total",
};

const en: TranslationDict = {
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.save": "Save",
  "common.close": "Close",

  // Not Found / Error page
  "notfound.desc": "The page you are looking for does not exist or has been moved.",
  "notfound.back": "Back Home",
  "error.title": "Something Went Wrong",
  "error.fallback": "An unexpected error occurred.",
  "error.retry": "Try Again",


  "app.title": "Savings Goal Tracker",
  "app.description": "Track monthly spending with an envelope system.",
  "app.cycleLabel": "{label}",
  "app.rangeSeparator": "to",
  "app.tabCharts": "Charts",
  "app.tabFacts": "Insights",
  "app.tabRecords": "Records",
  "app.overLimitTitle": "Spending Limit Exceeded!",
  "app.overLimitDesc":
    "Spending is {spent}, exceeding the limit of {limit}. Difference: {diff}.",


  "stats.initialBalance": "Balance",
  "stats.totalSpent": "Total Spending",
  "stats.limitRemaining": "Limit Remaining",

  "table.colPurchase": "Transaction",
  "table.colSubcategory": "Subcategory",
  "table.colAmount": "Amount",
  "table.colDate": "Date",
  "table.colAction": "Action",
  "table.editAria": "Edit transaction",
  "table.deleteAria": "Delete transaction",
  "table.deleteConfirm": "Delete this transaction?",
  "table.selected": "{n} selected",
  "table.deleteBulkConfirm": "Delete {n} transactions?",
  "table.addPurchase": "Add Transaction",
  "table.empty": "No transactions in this cycle",
  "table.searchPlaceholder": "Search transaction name...",
  "table.filterSubcategoryPlaceholder": "All Subcategories",
  "table.filterResult": "Showing {shown} of {total}",
  "table.noMatch": "No matching transactions found",

  "form.editTitle": "Edit Transaction",
  "form.addTitle": "Add Transaction",
  "form.name": "Transaction Name",
  "form.nameRequired": "Transaction name is required",
  "form.nameWhitespace": "Name cannot be only spaces",
  "form.namePlaceholder": "e.g. Lunch, Salary, Transfer",
  "form.subcategory": "Subcategory / Envelope",
  "form.subcategoryRequired": "Subcategory is required",
  "form.subcategoryPlaceholder": "Select subcategory",
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
  "chart.dailySpending": "Daily Spending",
  "chart.dailySpendingTitle": "Daily Spending by Date",

  "io.template": "Template",
  "io.export": "Export",
  "io.import": "Import",
  "io.templateTooltip": "Download CSV template (for Google Sheets)",
  "io.exportTooltip": "Export transactions to CSV",
  "io.importTooltip": "Import CSV from Google Sheets",
  "io.noDataExport": "No transactions to export.",
  "io.fileEmpty": "File is empty or unreadable.",
  "io.imported": "{n} transactions imported successfully.",
  "io.importedPartial": "{n} transactions imported. {m} rows skipped.",
  "io.importNone": "No transactions were imported.",
  "io.importFail": "Import failed: {msg}",
  "io.noValid": "No valid rows. {n} errors: {first}",

  "notif.permissionDenied":
    "Notification permission denied. Enable it in browser settings.",
  "notif.enabled":
    "Notifications enabled! You'll receive daily spending reminders.",
  "notif.enableFailed": "Failed to enable notifications.",
  "notif.disabled": "Notifications disabled.",
  "notif.disableFailed": "Failed to disable notifications.",
  "notif.activeTooltip": "Notifications active. Click to disable.",
  "notif.inactiveTooltip": "Enable notifications for daily spending reminders.",

  "clock.loading": "Loading...",
  "clock.ariaTime": "Current time {time}, {date}",

  "theme.light": "Light Mode",
  "theme.dark": "Dark Mode",
  "theme.enableLight": "Enable light mode",
  "theme.enableDark": "Enable dark mode",

  "lang.toggleAria": "Switch language",

  // PWA Install Prompt
  "pwa.installTitle": "Install App",
  "pwa.installDesc": "Install this app to your device for quick access.",
  "pwa.installBtn": "Install",
  "pwa.laterBtn": "Maybe later",
  "pwa.iosHint":
    "To install on iOS: tap the Share button, then choose Add to Home Screen.",

  // Insights / Analytics
  "insights.topKeywordsTitle": "Top 10 Transaction Keywords",
  "insights.empty": "No data yet",
  "insights.keywordStat": "{count}x transactions — total {total}",
  "insights.wadahTooltip": "Appears in {n} allocation envelopes",
  "insights.keywordFreqTooltip": "Frequency: {val}x",

  // Dev / Development (only shown when NODE_ENV === "development")
  "dev.title": "Test Notifications",
  "dev.trackingNudgeBtn": "Tracking Nudge",
  "dev.trackingNudgeTooltip":
    "Send push: tracking nudge when no spending logged",
  "dev.categorySpotlightBtn": "Category Spotlight",
  "dev.categorySpotlightTooltip":
    "Send push: weekly overspending envelope spotlight",
  "dev.cycleResetBtn": "Cycle Reset",
  "dev.cycleResetTooltip": "Send push: cycle reset reminder H-1",
  "dev.newCycleKickoffBtn": "New Cycle Kickoff",
  "dev.newCycleKickoffTooltip":
    "Send email: new cycle kickoff + allocation suggestions",
  "dev.monthlySummaryBtn": "Monthly Summary",
  "dev.monthlySummaryTooltip": "Send email: end-of-cycle recap",
  "dev.csvExportBtn": "CSV Export Reminder",
  "dev.csvExportTooltip": "Send email: CSV backup reminder",
  "dev.quarterlyTrendBtn": "Quarterly Trend",
  "dev.quarterlyTrendTooltip": "Send email: quarterly savings trend report",
  "dev.yearlyRecapBtn": "Yearly Recap",
  "dev.yearlyRecapTooltip": "Send email: end-of-year recap + top 3 spending envelopes",
  "dev.pushSuccess": "Notification sent ({val} subscriber).",
  "dev.emailSuccess": "Email sent successfully.",
  "dev.skipped": "Notification skipped — condition not met.",
  "dev.pushFailed": "Failed to send notification.",

  // Menu / Navigation (Finance = envelopes, Needs = envelope subcategories,
  // Budget, Target — separate pages)
  "menu.dashboard": "Dashboard",
  "menu.transactions": "Transactions",
  "menu.finance": "Finance",
  "menu.needs": "Needs",
  "menu.budget": "Budget",
  "menu.target": "Target",
  "menu.reports": "Reports",
  "menu.open": "Open menu",

  // Cycle navigation (navbar)
  "app.cyclePicker": "Select cycle month",

  // Auth / Login
  "auth.logout": "Log out",
  "auth.loginSubtitle": "Track monthly spending with an envelope system.",
  "auth.loginHint":
    "Sign in with Google — your finance data is stored safely per account.",
  "auth.googleBtn": "Sign in with Google",
  "auth.googleNotConfigured":
    "Google Auth is not configured (set GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET)",
  "auth.errorState": "Login session expired. Please try again.",
  "auth.errorExchange": "Failed to verify your Google account. Try again.",
  "auth.errorUnverified": "Your Google email is not verified.",
  "auth.errorGoogle": "Google sign-in was cancelled or failed.",
  "auth.errorDefault": "Login failed. Please try again.",

  // Multi-type form
  "form.typeExpense": "Expense",
  "form.typeIncome": "Income",
  "form.typeTransfer": "Transfer",
  "form.fromUnit": "From Envelope",
  "form.toUnit": "To Envelope",
  "form.toCategory": "To Destination Envelope",
  "form.toCategoryRequired": "Destination envelope is required",
  "form.toCategoryPlaceholder": "Select destination envelope",

  // Extra stats
  "stats.netSavings": "Net Balance",
  "stats.totalIncome": "Total Income",
  "stats.cashFlow": "Cash Flow",

  // Transaction table
  "table.colType": "Type",
  "table.filterAll": "All",
  "table.filterAllUnits": "All Envelopes",

  // Settings (only labels used by the Budget page remain)
  "settings.save": "Save",
  "settings.saved": "Changes saved",
  "settings.saveFailed": "Failed to save changes",
  "settings.cycleStartDay": "Cycle Start Day",
  "settings.cycleStartDayHint":
    "Day of month the cycle starts (1-28), configured per account.",
  "settings.categoriesEmpty":
    "No envelopes yet. Add your first envelope to start recording transactions.",
  "settings.addCategory": "Add Envelope",
  "settings.editCategory": "Edit Envelope",
  "settings.deleteCategoryConfirm":
    "Delete this envelope? Envelopes still used by transactions cannot be deleted.",
  "settings.deleteSubConfirm":
    "Delete this subcategory? Subcategories still used by transactions cannot be deleted.",
  "settings.categoryName": "Envelope Name",
  "settings.categoryColor": "Color",
  "settings.colorPresets": "Preset Colors",
  "settings.addSubcategory": "Add Subcategory",
  "settings.editSubcategory": "Edit Subcategory",
  "settings.subcategoryName": "Subcategory Name",

  // Categories (separate envelope & subcategory tables)
  "categories.wadahTitle": "Envelopes",
  "categories.subTitle": "Subcategories",
  "categories.subEmpty":
    "No subcategories yet. Add one from an existing envelope.",
  "categories.subCount": "{n} subcategories",

  // Finance: Wallets / Budget / Target pages
  "finance.walletType": "Wallet Type",
  "finance.walletBank": "Bank",
  "finance.walletEwallet": "E-Wallet",
  "finance.walletCash": "Cash",
  "finance.notAllocatedHint":
    "This envelope cannot spend or transfer yet. Record income or receive an incoming transfer first — allocation cannot be set manually.",
  "finance.walletFunds": "Funds",
  "finance.walletUsed": "Used",
  "finance.walletRemainingLabel": "Left ",
  "finance.walletOver": "Over ",
  "finance.allocationTotal": "Total Allocated",
  "finance.budgetIncome": "Income This Cycle",
  "finance.budgetProtected": "Protected Savings",
  "finance.budgetAllocatable": "Available to Allocate",
  "finance.budgetSpent": "Spent",
  "finance.budgetSettingTitle": "Set Savings per Cycle",
  "finance.budgetSettingHint":
    "The amount of savings that spending must not touch each cycle. Expenses that would exceed the allocation limit will require a forced confirmation before saving.",
  "finance.budgetOverTitle": "Allocation Exceeded",
  "finance.budgetOverDesc":
    "Spending {spent} has exceeded the {limit} allocation limit and touched your protected savings.",
  "finance.targetsTitle": "Savings Targets",
  "finance.addTarget": "Add Target",
  "finance.editTarget": "Edit Target",
  "finance.targetName": "Target Name",
  "finance.targetNameHint": "e.g. Buy a Phone, 1-Year Savings",
  "finance.targetAmount": "Target Amount",
  "finance.targetDeadlineLabel": "Deadline",
  "finance.targetDeadline": "Deadline (optional)",
  "finance.targetNote": "Note (optional)",
  "finance.targetScope": "Fund Source",
  "finance.targetScopeAll": "All Envelopes",
  "finance.targetScopeCustom": "Specific Envelopes",
  "finance.targetScopeCount": "{n} envelopes",
  "finance.targetScopeHint":
    "Funds are computed automatically from all-cycle net savings of the selected envelopes (income + transfers in − expenses − transfers out).",
  "finance.targetAutoHint":
    "Funds are computed automatically from all-cycle savings — no manual add-funds.",
  "finance.deleteTargetConfirm": "Delete this target?",
  "finance.targetsEmpty":
    "No targets yet. Create your first one, e.g. buy a phone or a 1-year savings goal.",
  "finance.targetProgress": "{saved} of {target}",

  // Recurring transactions & savings protection
  "form.repeatLabel": "Repeat",
  "form.repeatOnce": "Once",
  "form.repeatMonthly": "Every Month",
  "form.recurHint":
    "Automatically recorded on day {n} of the following months — no need to add it again.",
  "form.protectionTitle": "Touching Protected Savings",
  "form.protectionDesc":
    "Spending will reach {projected}, exceeding the {limit} allocation limit and touching your protected savings. Force continue?",
  "form.protectionConfirm": "Force Continue",
  "form.walletLimitTitle": "Insufficient Envelope Funds",
  "form.walletLimitDesc":
    "Total spending/transfers from {wallet} will reach {projected}, exceeding its available funds of {limit}. Record income or receive an incoming transfer to that envelope first.",
  "transactions.recurringTitle": "Recurring Transactions",
  "transactions.recurringEvery": "every day {n}",
  "transactions.recurringEmpty": "No recurring transactions yet.",
  "transactions.recurringTag": "Recurring",
  "transactions.recurringToggle": "Enable/disable the rule",
  "transactions.deleteRecurringConfirm":
    "Delete this recurring rule? Already-recorded transactions remain.",
  "transactions.viewAria": "Select transaction table view",

  // Needs: envelope subcategories (moved from the Finance page)
  "needs.title": "Needs",
  "needs.subcategories": "Subcategories",
  "needs.subEmptyInline": "No subcategories yet",
  "needs.subCount": "{n} subcategories total",
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

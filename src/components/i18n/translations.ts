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
  "common.loading": "Memuat…",

  // Not Found / Error page
  "notfound.desc":
    "Halaman yang Anda cari tidak tersedia atau sudah dipindahkan.",
  "notfound.back": "Kembali ke Beranda",
  "error.title": "Terjadi Kesalahan",
  "error.fallback": "Terjadi kesalahan yang tidak terduga.",
  "error.retry": "Coba Lagi",

  // App / Dashboard
  "app.title": "Savings Goal Tracker",
  "app.description": "Pantau pengeluaran bulanan dengan sistem wadah.",
  "app.logoAria": "Celengan",
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
  "stats.limitUsed": "Limit Terpakai",
  "stats.transactionCount": "Jumlah Transaksi",
  "stats.dailyAvg": "Rata-rata Harian",
  "stats.profit": "Keuntungan",
  "stats.profitDesc": "Persentase pemasukan yang berhasil disimpan",
  "stats.incomeDesc": "Seluruh pemasukan yang pernah tercatat",
  "stats.spentDesc": "Seluruh pengeluaran yang pernah tercatat",
  "stats.cashFlowDesc": "Pemasukan dikurangi total pengeluaran",
  "stats.cycleAchievement": "Pencapaian Siklus Ini",
  "stats.balanceCycle": "Saldo Siklus Ini",
  "stats.limitRemainingCycle": "Sisa Limit Siklus Ini",

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
  "table.filterWholeWallet": "Semua",
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
  "chart.topCategories": "Top {n}",

  // Dashboard (rekomendasi D1)
  "dashboard.firstTransaction": "Catat transaksi pertama",
  "dashboard.recentTitle": "Transaksi Terakhir",
  "dashboard.viewAll": "Lihat semua",
  "dashboard.rangeLabel": "Rentang historis",
  "dashboard.rangeCycles": "{n} siklus",

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

  // Reports / Laporan (rekomendasi D7)
  "reports.quickTitle": "Ringkasan Cepat",
  "reports.noExpense": "Belum ada pengeluaran di rentang ini",
  "reports.peakDay": "Hari Paling Boros",
  "reports.avgPerTransaction": "Rata-rata per Transaksi",
  "reports.avgTransactions": "dari {n} transaksi",
  "reports.fixedVariable": "Tetap vs Variabel",
  "reports.fixedVariableValue": "{fixed}% : {variable}%",
  "reports.fixedVariableDesc": "Tetap {fixed} · variabel {variable}",
  "reports.comparisonTitle": "Perbandingan Siklus",
  "reports.comparisonDesc": "Pengeluaran per wadah: {current} vs {previous}",
  "reports.comparisonVs": "vs {amount}",
  "reports.comparisonNew": "Baru",
  "reports.comparisonFlat": "Tetap",
  "reports.comparisonTotal": "Total",
  "reports.comparisonEmpty": "Belum ada pengeluaran di kedua siklus",
  "reports.colWallet": "Wadah",
  "reports.comparisonCurrent": "Siklus Ini",
  "reports.comparisonPrevious": "Siklus Lalu",
  "reports.comparisonChange": "Perubahan",
  "reports.rangeAria": "Pilih rentang laporan",
  "reports.export": "Export Laporan",
  "reports.exportTooltip": "Download laporan lengkap (CSV)",
  "reports.csvComparison": "Perbandingan siklus per wadah",
  "reports.csvInsights": "Ringkasan cepat",
  "reports.csvKeyword": "Keyword",
  "reports.csvCount": "Jumlah",
  "reports.csvTotal": "Total",

  // Dev / Development (hanya tampil saat NODE_ENV === "development")
  "dev.title": "Tes Notifikasi",
  "dev.trackingNudgeBtn": "Tracking Nudge",
  "dev.trackingNudgeTooltip": "Kirim push: pengingat belum mencatat",
  "dev.categorySpotlightBtn": "Category Spotlight",
  "dev.categorySpotlightTooltip": "Kirim push: sorotan wadah boros mingguan",
  "dev.cycleResetBtn": "Cycle Reset",
  "dev.cycleResetTooltip": "Kirim push: pengingat reset siklus H-1",
  "dev.targetDeadlineBtn": "Target Deadline",
  "dev.targetDeadlineTooltip": "Kirim push: pengingat batas waktu target (H-7)",
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
  "dev.yearlyRecapTooltip":
    "Kirim email: rekap akhir tahunan + top 3 wadah terboros",
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
  "app.today": "Hari Ini",
  "app.todayAria": "Kembali ke hari ini",

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
  "auth.errorLimit": "Pendaftaran baru ditutup — kuota 5 akun sudah tercapai.",
  "auth.errorDefault": "Gagal login. Coba lagi.",

  // Metadata halaman (title/description <head> — dipakai buildPageMetadata)
  "auth.loginTitle": "Login",
  "meta.descLogin":
    "Masuk dengan akun Google untuk mencatat pengeluaran dan mengejar target tabungan Anda.",
  "meta.descBudget":
    "Atur nominal tabungan yang dilindungi tiap siklus agar tidak tersentuh pengeluaran.",
  "meta.descFinance":
    "Pantau dana tiap wadah beserta pemasukan dan pengeluaran siklus aktif.",
  "meta.descNeeds":
    "Kelola subkategori kebutuhan pada tiap wadah alokasi Anda.",
  "meta.descReports":
    "Lihat insight kata kunci transaksi untuk memahami kebiasaan belanja.",
  "meta.descTarget":
    "Susun target tabungan dan pantau dana terkumpul yang dihitung otomatis.",
  "meta.descTransactions":
    "Catat, cari, dan kelola seluruh transaksi pada siklus aktif.",

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
  "categories.subEmpty":
    "Belum ada subkategori. Tambahkan dari wadah yang tersedia.",
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
    "Nominal tabungan yang tidak boleh tersentuh pengeluaran pada setiap siklus. Nilainya DINAMIS PER SIKLUS — siklus baru mulai dari 0 dan nilai yang diisi hanya berlaku untuk siklus yang sedang dipilih.",
  "finance.budgetProtectedHint":
    "Hanya berlaku untuk siklus yang sedang dipilih — siklus baru selalu mulai dari 0.",
  "finance.budgetProtectedSettledHint":
    "Siklus ini sudah dikunci (hari terakhir siklus) — nilainya tersimpan sebagai riwayat.",
  "finance.budgetCycleStatusTitle": "Status Siklus {cycle}",
  "finance.budgetSettledTag": "Nilai dikunci",
  "finance.budgetOpenTag": "Masih bisa diubah",
  "finance.budgetWalletLockedTag": "Dompet terkunci (hanya pemasukan)",
  "finance.budgetSettledHint":
    "Uang disimpan pada hari terakhir siklus, jadi nilai tabungan dilindungi siklus ini tidak bisa diubah lagi.",
  "finance.budgetOpenHint":
    "Tabungan dilindungi siklus ini masih bisa diubah sampai hari terakhir siklus.",
  "finance.budgetLeftoverLabel": "Sisa saldo seluruh dompet: {amount}",
  "finance.budgetLeftoverBreakdown":
    "Tabungan dilindungi = {base} (diisi) + {leftover} (sisa dompet).",
  "finance.budgetLeftoverAction": "Pindahkan Sisa ke Tabungan Dilindungi",
  "finance.budgetLeftoverDone": "Sisa Sudah Dipindahkan",
  "finance.budgetLeftoverUnavailable":
    "Hanya bisa dipindahkan pada hari terakhir siklus dan bila masih ada sisa saldo dompet.",
  "finance.budgetLeftoverConfirmTitle": "Pindahkan sisa ke tabungan dilindungi?",
  "finance.budgetLeftoverConfirmDesc":
    "Sisa saldo seluruh dompet sebesar {amount} akan ditambahkan ke tabungan dilindungi siklus ini. Setelah dipindahkan, seluruh dompet pada siklus ini hanya bisa menerima pemasukan (tidak bisa pengeluaran atau transfer).",
  "finance.budgetLeftoverConfirmOk": "Pindahkan",
  "finance.budgetLeftoverSuccess":
    "Sisa dompet berhasil dipindahkan ke tabungan dilindungi.",
  "finance.walletsLockedTitle": "Dompet Siklus Ini Terkunci",
  "finance.walletsLockedDesc":
    "Sisa saldo dompet siklus ini sudah dipindahkan ke tabungan dilindungi, jadi wadah hanya bisa menerima pemasukan — pengeluaran dan transfer dimatikan sampai siklus berikutnya.",
  "finance.budgetOverTitle": "Alokasi Terlampaui",
  "finance.budgetOverDesc":
    "Pengeluaran {spent} sudah melebihi batas alokasi {limit} dan menyentuh tabungan dilindungi.",
  // D5: progress bar Terpakai vs Bisa Dialokasikan + riwayat pelanggaran
  "finance.budgetProgressTitle": "Terpakai vs Bisa Dialokasikan",
  "finance.budgetProgressLegend": "Terpakai {spent} dari {allocatable}",
  "finance.budgetRemaining": "Sisa alokasi {amount}",
  "finance.budgetOverBy": "Lebih {amount} dari batas alokasi",
  "finance.budgetForcedTitle": "Riwayat Pelanggaran",
  "finance.budgetForcedCount":
    "{n} kali dipaksa siklus ini — pengeluaran sengaja melewati proteksi tabungan dilindungi.",
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

  // Estimasi, urut, & aksi cepat target (rekomendasi D6)
  "finance.targetMonthlyEstimate": "Sisihkan ±{amount}/bulan",
  "finance.targetMonthsLeft": "{n} bulan lagi",
  "finance.targetDaysLeftTag": "H-{n}",
  "finance.targetDueToday": "hari ini",
  "finance.targetOverdue": "Batas waktu terlewat — dana belum terkumpul penuh",
  "finance.targetOverdueTag": "terlewat",
  "finance.targetSortAria": "Urutkan target",
  "finance.targetSortDefault": "Urutan Buat",
  "finance.targetSortDeadline": "Batas Terdekat",
  "finance.targetSortProgress": "Progres Tertinggi",
  "finance.targetSortAlmost": "Hampir Tercapai",
  "finance.targetNoAlmost": "Tidak ada target dengan progres ≥ 70%.",
  "finance.targetRecordDeposit": "Catat Setoran",
  "finance.targetRecordDepositAria": "Catat setoran untuk target {name}",

  // Aksi cepat & info wadah (rekomendasi D3)
  "finance.searchPlaceholder": "Cari wadah…",
  "finance.searchEmpty": "Tidak ada wadah yang cocok",
  "finance.walletTxCount": "{n} transaksi",
  "finance.walletLastRecord": "terakhir {date}",
  "finance.walletNoTx": "Belum ada transaksi siklus ini",
  "finance.viewMutations": "Lihat Mutasi Wadah",
  "finance.transferFrom": "Transfer dari wadah ini",
  "finance.moveUpAria": "Naikkan urutan {name}",
  "finance.moveDownAria": "Turunkan urutan {name}",

  // Transaksi berulang & proteksi tabungan
  "form.repeatLabel": "Pengulangan",
  "form.repeatOnce": "Sekali",
  "form.repeatMonthly": "Setiap Bulan",
  "form.recurHint":
    "Otomatis tercatat setiap tanggal {n} bulan berikutnya — tanpa perlu tambah transaksi lagi.",
  "form.recurringAddTitle": "Tambah Aturan Berulang",
  "form.recurringEditTitle": "Edit Aturan Berulang",
  "form.dayOfMonth": "Tanggal Berulang (1–31)",
  "form.dayOfMonthRequired": "Tanggal berulang wajib diisi",
  "form.dayOfMonthRange": "Tanggal harus antara 1–31",
  "form.dayOfMonthHint":
    "Otomatis tercatat setiap tanggal {n} — di bulan pendek (mis. Februari) digeser ke akhir bulan.",
  "form.protectionTitle": "Menyentuh Tabungan Dilindungi",
  "form.protectionDesc":
    "Pengeluaran akan menjadi {projected}, melebihi batas alokasi {limit} dan menyentuh tabungan yang Anda lindungi. Lanjutkan terpaksa?",
  "form.protectionConfirm": "Lanjutkan Terpaksa",
  "form.walletLimitTitle": "Dana Wadah Tidak Cukup",
  "form.walletLimitDesc":
    "Total pengeluaran/transfer dari wadah {wallet} akan menjadi {projected}, melebihi dana tersedia {limit}. Catat pemasukan atau terima transfer masuk ke wadah tersebut terlebih dulu.",
  "form.walletLockedTitle": "Siklus Terkunci",
  "form.walletLockedDesc":
    "Sisa saldo dompet siklus ini sudah dipindahkan ke tabungan dilindungi, jadi hanya pemasukan yang bisa dicatat. {detail}",
  "transactions.recurringTitle": "Transaksi Berulang",
  "transactions.recurringEvery": "tiap tanggal {n}",
  "transactions.recurringEmpty": "Belum ada transaksi berulang.",
  "transactions.recurringAdd": "Tambah Aturan",
  "transactions.recurringEdit": "Edit aturan",
  "transactions.recurringTag": "Berulang",
  "transactions.recurringToggle": "Aktifkan/nonaktifkan aturan",
  "transactions.deleteRecurringConfirm":
    "Hapus aturan berulang ini? Transaksi yang sudah tercatat tetap ada.",
  "transactions.viewAria": "Pilih tampilan tabel transaksi",

  // Rentang pencarian transaksi (rekomendasi D2 — lintas siklus)
  "transactions.rangeAria": "Pilih rentang transaksi",
  "transactions.rangeCycle": "Siklus ini",
  "transactions.rangeCycles": "{n} siklus",
  "transactions.rangeAll": "Semua waktu",

  // Kebutuhan: subkategori wadah (dipindah dari halaman Keuangan)
  "needs.title": "Kebutuhan",
  "needs.subcategories": "Subkategori",
  "needs.subEmptyInline": "Belum ada subkategori",
  "needs.subCount": "{n} subkategori total",
  // D4: pencarian lintas wadah + pindah wadah saat edit
  "needs.searchPlaceholder": "Cari subkategori…",
  "needs.searchEmpty": "Tidak ada subkategori yang cocok",
  "needs.moveHint": "Ubah wadah untuk memindahkan subkategori ini.",

  // Integrasi WhatsApp (bot transaksi via chat)
  "whatsapp.menuLabel": "WhatsApp",
  "whatsapp.title": "Integrasi WhatsApp",
  "whatsapp.desc": "Catat transaksi langsung dari chat WhatsApp — kirim pesan ke nomor bot.",
  "whatsapp.botStatus": "Status Bot",
  "whatsapp.botActive": "Aktif",
  "whatsapp.botInactive": "Nonaktif",
  "whatsapp.botNotConfigured": "Belum Dikonfigurasi",
  "whatsapp.botNumber": "Nomor Bot",
  "whatsapp.linkedNumber": "Nomor Terhubung",
  "whatsapp.notLinked": "Belum ada nomor WhatsApp terhubung.",
  "whatsapp.linkedAt": "Terhubung sejak {date}",
  "whatsapp.unlink": "Putuskan",
  "whatsapp.unlinkConfirm": "Putuskan nomor WhatsApp ini dari akun Anda?",
  "whatsapp.unlinkSuccess": "Nomor WhatsApp diputuskan.",
  "whatsapp.getCode": "Buat Kode Pairing",
  "whatsapp.codeLabel": "Kode Pairing Anda",
  "whatsapp.codeExpires": "Berlaku {minutes} menit — buat ulang bila kedaluwarsa.",
  "whatsapp.stepTitle": "Cara menghubungkan:",
  "whatsapp.step1": "Pastikan status bot Aktif.",
  "whatsapp.step2": "Dari WhatsApp Anda, kirim ke nomor bot: link {code}",
  "whatsapp.step3": "Bot membalas konfirmasi — nomor pun terhubung.",
  "whatsapp.codeSuccess": "Kode pairing berhasil dibuat.",
  "whatsapp.loadFailed": "Gagal memuat status WhatsApp.",
  "whatsapp.actionFailed": "Gagal memproses. Coba lagi.",

  // Footer
  "footer.madeWith": "Dibangun dengan",
  "footer.deployedOn": "di-deploy di",
  "footer.rights": "Hak cipta dilindungi",
};

const en: TranslationDict = {
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.save": "Save",
  "common.close": "Close",
  "common.loading": "Loading…",

  // Not Found / Error page
  "notfound.desc":
    "The page you are looking for does not exist or has been moved.",
  "notfound.back": "Back Home",
  "error.title": "Something Went Wrong",
  "error.fallback": "An unexpected error occurred.",
  "error.retry": "Try Again",

  "app.title": "Savings Goal Tracker",
  "app.description": "Track monthly spending with an envelope system.",
  "app.logoAria": "Piggy bank",
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
  "stats.limitUsed": "Limit Used",
  "stats.transactionCount": "Transactions",
  "stats.dailyAvg": "Daily Average",
  "stats.profit": "Profit",
  "stats.profitDesc": "Percentage of income successfully saved",
  "stats.incomeDesc": "All income ever recorded",
  "stats.spentDesc": "All spending ever recorded",
  "stats.cashFlowDesc": "Income minus total spending",
  "stats.cycleAchievement": "This Cycle's Achievement",
  "stats.balanceCycle": "Balance This Cycle",
  "stats.limitRemainingCycle": "Limit Remaining This Cycle",

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
  "table.filterWholeWallet": "All",
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
  "chart.topCategories": "Top {n}",

  // Dashboard (rekomendasi D1)
  "dashboard.firstTransaction": "Record first transaction",
  "dashboard.recentTitle": "Recent Transactions",
  "dashboard.viewAll": "View all",
  "dashboard.rangeLabel": "Historical range",
  "dashboard.rangeCycles": "{n} cycles",

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

  // Reports (D7 recommendation)
  "reports.quickTitle": "Quick Summary",
  "reports.noExpense": "No expenses in this range yet",
  "reports.peakDay": "Most Expensive Day",
  "reports.avgPerTransaction": "Avg per Transaction",
  "reports.avgTransactions": "from {n} transactions",
  "reports.fixedVariable": "Fixed vs Variable",
  "reports.fixedVariableValue": "{fixed}% : {variable}%",
  "reports.fixedVariableDesc": "Fixed {fixed} · variable {variable}",
  "reports.comparisonTitle": "Cycle Comparison",
  "reports.comparisonDesc": "Spending per envelope: {current} vs {previous}",
  "reports.comparisonVs": "vs {amount}",
  "reports.comparisonNew": "New",
  "reports.comparisonFlat": "Flat",
  "reports.comparisonTotal": "Total",
  "reports.comparisonEmpty": "No expenses in either cycle yet",
  "reports.colWallet": "Envelope",
  "reports.comparisonCurrent": "This Cycle",
  "reports.comparisonPrevious": "Previous Cycle",
  "reports.comparisonChange": "Change",
  "reports.rangeAria": "Select report range",
  "reports.export": "Export Report",
  "reports.exportTooltip": "Download full report (CSV)",
  "reports.csvComparison": "Cycle comparison per envelope",
  "reports.csvInsights": "Quick summary",
  "reports.csvKeyword": "Keyword",
  "reports.csvCount": "Count",
  "reports.csvTotal": "Total",

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
  "dev.targetDeadlineBtn": "Target Deadline",
  "dev.targetDeadlineTooltip": "Send push: target deadline reminder (D-7)",
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
  "dev.yearlyRecapTooltip":
    "Send email: end-of-year recap + top 3 spending envelopes",
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
  "app.today": "Today",
  "app.todayAria": "Back to today",

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
  "auth.errorLimit":
    "New registrations are closed — the 5-account quota has been reached.",
  "auth.errorDefault": "Login failed. Please try again.",

  // Page metadata (title/description <head> — used by buildPageMetadata)
  "auth.loginTitle": "Login",
  "meta.descLogin":
    "Sign in with your Google account to track spending and chase your savings goals.",
  "meta.descBudget":
    "Set the protected savings amount for each cycle so spending never touches it.",
  "meta.descFinance":
    "Monitor funds per envelope along with income and spending for the active cycle.",
  "meta.descNeeds":
    "Manage needs subcategories for each of your allocation envelopes.",
  "meta.descReports":
    "See transaction keyword insights to understand your spending habits.",
  "meta.descTarget":
    "Set savings goals and track funds accumulated automatically.",
  "meta.descTransactions":
    "Record, search, and manage all transactions in the active cycle.",

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
    "The amount of savings that spending must not touch each cycle. The value is DYNAMIC PER CYCLE — a new cycle always starts at 0 and the value you enter only applies to the selected cycle.",
  "finance.budgetProtectedHint":
    "Applies only to the selected cycle — a new cycle always starts at 0.",
  "finance.budgetProtectedSettledHint":
    "This cycle is locked (last day of the cycle) — the value is kept as history.",
  "finance.budgetCycleStatusTitle": "Cycle {cycle} Status",
  "finance.budgetSettledTag": "Value locked",
  "finance.budgetOpenTag": "Still editable",
  "finance.budgetWalletLockedTag": "Envelopes locked (income only)",
  "finance.budgetSettledHint":
    "Money is stored on the last day of the cycle, so this cycle's protected savings can no longer be changed.",
  "finance.budgetOpenHint":
    "This cycle's protected savings remains editable until the last day of the cycle.",
  "finance.budgetLeftoverLabel": "Leftover across all envelopes: {amount}",
  "finance.budgetLeftoverBreakdown":
    "Protected savings = {base} (entered) + {leftover} (envelope leftover).",
  "finance.budgetLeftoverAction": "Move Leftover to Protected Savings",
  "finance.budgetLeftoverDone": "Leftover Already Moved",
  "finance.budgetLeftoverUnavailable":
    "Can only be moved on the last day of the cycle and when an envelope leftover exists.",
  "finance.budgetLeftoverConfirmTitle": "Move the leftover to protected savings?",
  "finance.budgetLeftoverConfirmDesc":
    "The {amount} leftover across all envelopes will be added to this cycle's protected savings. Once moved, every envelope in this cycle can only receive income (no expenses or transfers).",
  "finance.budgetLeftoverConfirmOk": "Move",
  "finance.budgetLeftoverSuccess":
    "Envelope leftover moved to protected savings.",
  "finance.walletsLockedTitle": "This Cycle's Envelopes Are Locked",
  "finance.walletsLockedDesc":
    "This cycle's envelope leftover has been moved to protected savings, so envelopes can only receive income — expenses and transfers are disabled until the next cycle.",
  "finance.budgetOverTitle": "Allocation Exceeded",
  "finance.budgetOverDesc":
    "Spending {spent} has exceeded the {limit} allocation limit and touched your protected savings.",
  // D5: Spent vs Available to Allocate progress + violation history
  "finance.budgetProgressTitle": "Spent vs Available to Allocate",
  "finance.budgetProgressLegend": "Spent {spent} of {allocatable}",
  "finance.budgetRemaining": "{amount} left to allocate",
  "finance.budgetOverBy": "Over the allocation limit by {amount}",
  "finance.budgetForcedTitle": "Violation History",
  "finance.budgetForcedCount":
    "Forced {n} time(s) this cycle — expenses deliberately bypassed the protected savings.",
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

  // Target estimate, sorting, & quick action (D6 recommendation)
  "finance.targetMonthlyEstimate": "Set aside ±{amount}/month",
  "finance.targetMonthsLeft": "{n} months left",
  "finance.targetDaysLeftTag": "{n} days left",
  "finance.targetDueToday": "today",
  "finance.targetOverdue": "Deadline passed — funds not fully collected",
  "finance.targetOverdueTag": "overdue",
  "finance.targetSortAria": "Sort targets",
  "finance.targetSortDefault": "Created Order",
  "finance.targetSortDeadline": "Nearest Deadline",
  "finance.targetSortProgress": "Highest Progress",
  "finance.targetSortAlmost": "Almost Reached",
  "finance.targetNoAlmost": "No targets with progress ≥ 70%.",
  "finance.targetRecordDeposit": "Record Deposit",
  "finance.targetRecordDepositAria": "Record deposit for target {name}",

  // Wallet quick actions & info (D3 recommendation)
  "finance.searchPlaceholder": "Search wallets…",
  "finance.searchEmpty": "No matching wallets",
  "finance.walletTxCount": "{n} transactions",
  "finance.walletLastRecord": "last {date}",
  "finance.walletNoTx": "No transactions this cycle",
  "finance.viewMutations": "View Wallet Transactions",
  "finance.transferFrom": "Transfer from this wallet",
  "finance.moveUpAria": "Move {name} up",
  "finance.moveDownAria": "Move {name} down",

  // Recurring transactions & savings protection
  "form.repeatLabel": "Repeat",
  "form.repeatOnce": "Once",
  "form.repeatMonthly": "Every Month",
  "form.recurHint":
    "Automatically recorded on day {n} of the following months — no need to add it again.",
  "form.recurringAddTitle": "Add Recurring Rule",
  "form.recurringEditTitle": "Edit Recurring Rule",
  "form.dayOfMonth": "Day of Month (1–31)",
  "form.dayOfMonthRequired": "Day of month is required",
  "form.dayOfMonthRange": "Day must be between 1 and 31",
  "form.dayOfMonthHint":
    "Automatically recorded every day {n} — shifted to the month's end in short months (e.g. February).",
  "form.protectionTitle": "Touching Protected Savings",
  "form.protectionDesc":
    "Spending will reach {projected}, exceeding the {limit} allocation limit and touching your protected savings. Force continue?",
  "form.protectionConfirm": "Force Continue",
  "form.walletLimitTitle": "Insufficient Envelope Funds",
  "form.walletLimitDesc":
    "Total spending/transfers from {wallet} will reach {projected}, exceeding its available funds of {limit}. Record income or receive an incoming transfer to that envelope first.",
  "form.walletLockedTitle": "Cycle Locked",
  "form.walletLockedDesc":
    "This cycle's envelope leftover has been moved to protected savings, so only income can be recorded. {detail}",
  "transactions.recurringTitle": "Recurring Transactions",
  "transactions.recurringEvery": "every day {n}",
  "transactions.recurringEmpty": "No recurring transactions yet.",
  "transactions.recurringAdd": "Add Rule",
  "transactions.recurringEdit": "Edit rule",
  "transactions.recurringTag": "Recurring",
  "transactions.recurringToggle": "Enable/disable the rule",
  "transactions.deleteRecurringConfirm":
    "Delete this recurring rule? Already-recorded transactions remain.",
  "transactions.viewAria": "Select transaction table view",

  // Transaction search range (D2 recommendation — cross-cycle)
  "transactions.rangeAria": "Select transaction range",
  "transactions.rangeCycle": "This cycle",
  "transactions.rangeCycles": "{n} cycles",
  "transactions.rangeAll": "All time",

  // Needs: envelope subcategories (moved from the Finance page)
  "needs.title": "Needs",
  "needs.subcategories": "Subcategories",
  "needs.subEmptyInline": "No subcategories yet",
  "needs.subCount": "{n} subcategories total",
  // D4: cross-envelope search + move envelope on edit
  "needs.searchPlaceholder": "Search subcategories…",
  "needs.searchEmpty": "No matching subcategories",
  "needs.moveHint": "Change the envelope to move this subcategory.",

  // WhatsApp integration (transaction bot via chat)
  "whatsapp.menuLabel": "WhatsApp",
  "whatsapp.title": "WhatsApp Integration",
  "whatsapp.desc": "Record transactions straight from WhatsApp chats — message the bot number.",
  "whatsapp.botStatus": "Bot Status",
  "whatsapp.botActive": "Active",
  "whatsapp.botInactive": "Inactive",
  "whatsapp.botNotConfigured": "Not Configured",
  "whatsapp.botNumber": "Bot Number",
  "whatsapp.linkedNumber": "Linked Number",
  "whatsapp.notLinked": "No WhatsApp number linked yet.",
  "whatsapp.linkedAt": "Linked since {date}",
  "whatsapp.unlink": "Unlink",
  "whatsapp.unlinkConfirm": "Unlink this WhatsApp number from your account?",
  "whatsapp.unlinkSuccess": "WhatsApp number unlinked.",
  "whatsapp.getCode": "Generate Pairing Code",
  "whatsapp.codeLabel": "Your Pairing Code",
  "whatsapp.codeExpires": "Valid for {minutes} minutes — regenerate if expired.",
  "whatsapp.stepTitle": "How to link:",
  "whatsapp.step1": "Make sure the bot status is Active.",
  "whatsapp.step2": "From your WhatsApp, send to the bot number: link {code}",
  "whatsapp.step3": "The bot replies with a confirmation — your number is linked.",
  "whatsapp.codeSuccess": "Pairing code generated.",
  "whatsapp.loadFailed": "Failed to load WhatsApp status.",
  "whatsapp.actionFailed": "Failed to process. Try again.",

  // Footer
  "footer.madeWith": "Built with",
  "footer.deployedOn": "deployed on",
  "footer.rights": "All rights reserved",
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

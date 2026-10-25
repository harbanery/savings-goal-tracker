-- D5 (rekomendasi_feature.md): tandai transaksi pengeluaran yang dipaksa
-- melewati proteksi tabungan (konfirmasi "terpaksa") — riwayat pelanggaran
-- per siklus di halaman Budget.
ALTER TABLE "transactions" ADD COLUMN "forced" BOOLEAN NOT NULL DEFAULT false;

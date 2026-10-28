-- DROID.md (Budget): tabungan dilindungi jadi DINAMIS PER SIKLUS.
--
-- Sebelumnya `user_settings.protected_savings` adalah satu skalar global —
-- nilai yang sama berlaku untuk semua siklus. Kini tiap siklus punya
-- nilainya sendiri: siklus baru mulai dari 0, nilai tiap siklus tersimpan
-- sebagai riwayat, dan uang "disimpan" pada hari terakhir siklus.
--
-- Kolom lama `user_settings.protected_savings` DIPERTAHANKAN (tidak
-- dibaca jalur aplikasi) demi kompatibilitas data lama; migrasi ini
-- menyalin nilainya ke siklus yang sedang berjalan saat deploy agar
-- tabungan dilindungi user tidak mendadak 0.
-- Siklus berjalan dihitung dari `cycle_start_day` user (aturan yang sama
-- dengan CycleInfo: tanggal >= startDay masuk siklus bulan berikutnya).

CREATE TABLE "cycle_budgets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "cycle_key" TEXT NOT NULL,
    "protected_savings" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "leftover_added" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "settled_at" TIMESTAMP(3),
    "locked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cycle_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cycle_budgets_user_id_cycle_key_key" ON "cycle_budgets"("user_id", "cycle_key");

-- CreateIndex
CREATE INDEX "cycle_budgets_user_id_idx" ON "cycle_budgets"("user_id");

-- AddForeignKey
ALTER TABLE "cycle_budgets" ADD CONSTRAINT "cycle_budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: salin tabungan dilindungi lama ke siklus yang SEDANG berjalan
-- (hanya bila nilainya > 0). Kunci siklus mengikuti aturan tanggal mulai
-- siklus user, memakai hari kanonik UTC (CURRENT_DATE di server UTC) —
-- konsisten dengan getCycleForDate() di aplikasi.
INSERT INTO "cycle_budgets" (
    "id", "user_id", "cycle_key", "protected_savings",
    "leftover_added", "created_at", "updated_at"
)
SELECT
    gen_random_uuid(),
    s."user_id",
    to_char(
        (CASE
            WHEN EXTRACT(DAY FROM (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'))::int >= s."cycle_start_day"
                THEN (date_trunc('month', (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')) + interval '1 month')
            ELSE date_trunc('month', (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'))
        END),
        'YYYY-MM'
    ),
    s."protected_savings",
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "user_settings" s
WHERE s."protected_savings" > 0
ON CONFLICT ("user_id", "cycle_key") DO NOTHING;

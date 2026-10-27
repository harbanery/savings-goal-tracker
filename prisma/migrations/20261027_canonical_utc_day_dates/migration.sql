-- Normalisasi tanggal transaksi & deadline target ke hari kanonik
-- (tengah malam UTC).
--
-- Latar belakang: sebelumnya tanggal dibangun/dibaca dengan timezone
-- lokal mesin (klien WIB, server produksi UTC). Akibatnya transaksi
-- berulang yang jatuh tepat di tanggal mulai siklus bisa tercatat di
-- siklus sebelumnya, dan label tanggal bisa bergeser satu hari.
-- Kini seluruh logika level-hari memakai tengah malam UTC (hari kanonik).
--
-- Data lama umumnya dibuat oleh user WIB (UTC+7): geser +7 jam lalu
-- potong ke hari UTC — hari kalender yang dilihat user tetap sama.
-- Baris yang sudah tepat di tengah malam UTC tidak berubah (idempoten).

UPDATE "transactions"
SET "date" = date_trunc('day', "date" + interval '7 hours');

UPDATE "transactions"
SET "recurring_date" = date_trunc('day', "recurring_date" + interval '7 hours')
WHERE "recurring_date" IS NOT NULL;

UPDATE "savings_targets"
SET "deadline" = date_trunc('day', "deadline" + interval '7 hours')
WHERE "deadline" IS NOT NULL;

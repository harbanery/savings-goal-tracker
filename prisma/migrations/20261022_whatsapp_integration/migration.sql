-- Integrasi WhatsApp (Baileys worker — proses terpisah, lihat worker/README.md):
-- akun bot singleton + status koneksi, link JID user, kode pairing,
-- outbox pesan keluar (dipoll worker), dan log pesan masuk.

-- CreateTable
CREATE TABLE "whatsapp_account" (
    "id" UUID NOT NULL,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "state" JSONB,
    "last_connected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_links" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "jid" TEXT NOT NULL,
    "linked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_pairings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_pairings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_inbound" (
    "id" UUID NOT NULL,
    "jid" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "reply" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_inbound_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_links_jid_key" ON "whatsapp_links"("jid");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_pairings_code_hash_key" ON "whatsapp_pairings"("code_hash");

-- CreateIndex
CREATE INDEX "whatsapp_links_user_id_idx" ON "whatsapp_links"("user_id");

-- CreateIndex
CREATE INDEX "whatsapp_pairings_user_id_idx" ON "whatsapp_pairings"("user_id");

-- CreateIndex
CREATE INDEX "whatsapp_inbound_jid_created_at_idx" ON "whatsapp_inbound"("jid", "created_at");

-- AddForeignKey
ALTER TABLE "whatsapp_links" ADD CONSTRAINT "whatsapp_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_pairings" ADD CONSTRAINT "whatsapp_pairings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

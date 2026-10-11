-- CreateEnum
CREATE TYPE "wallet_type" AS ENUM ('BANK', 'E_WALLET');

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "wallet_type" "wallet_type" NOT NULL DEFAULT 'E_WALLET';

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "recurring_date" TIMESTAMP(3),
ADD COLUMN     "recurring_id" UUID;

-- AlterTable
ALTER TABLE "user_settings" ADD COLUMN     "protected_savings" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "savings_targets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "target_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "saved_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "deadline" TIMESTAMP(3),
    "note" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "savings_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "day_of_month" INTEGER NOT NULL,
    "category_id" UUID NOT NULL,
    "subcategory_id" UUID,
    "note" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "savings_targets_user_id_idx" ON "savings_targets"("user_id");

-- CreateIndex
CREATE INDEX "recurring_transactions_user_id_idx" ON "recurring_transactions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_recurring_id_recurring_date_key" ON "transactions"("recurring_id", "recurring_date");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurring_id_fkey" FOREIGN KEY ("recurring_id") REFERENCES "recurring_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_targets" ADD CONSTRAINT "savings_targets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


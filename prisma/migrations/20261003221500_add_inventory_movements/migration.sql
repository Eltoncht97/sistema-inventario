-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('ENTRY', 'EXIT', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "type" "InventoryMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "delta" INTEGER NOT NULL,
    "quantity_before" INTEGER NOT NULL,
    "quantity_after" INTEGER NOT NULL,
    "reason" VARCHAR(500),
    "idempotency_key" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "inventory_movements_quantity_non_negative" CHECK ("quantity" >= 0),
    CONSTRAINT "inventory_movements_quantity_before_non_negative" CHECK ("quantity_before" >= 0),
    CONSTRAINT "inventory_movements_quantity_after_non_negative" CHECK ("quantity_after" >= 0),
    CONSTRAINT "inventory_movements_balance_consistent" CHECK ("quantity_after" = "quantity_before" + "delta"),
    CONSTRAINT "inventory_movements_type_semantics" CHECK (
      ("type" = 'ENTRY' AND "quantity" > 0 AND "delta" = "quantity") OR
      ("type" = 'EXIT' AND "quantity" > 0 AND "delta" = -"quantity") OR
      ("type" = 'ADJUSTMENT' AND "quantity_after" = "quantity" AND "reason" IS NOT NULL AND btrim("reason") <> '')
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_movements_idempotency_key_key" ON "inventory_movements"("idempotency_key");

-- CreateIndex
CREATE INDEX "inventory_movements_product_id_created_at_idx" ON "inventory_movements"("product_id", "created_at");

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

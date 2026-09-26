-- This is an empty migration.
ALTER TABLE "products"
ADD CONSTRAINT "products_price_non_negative"
CHECK ("price" >= 0);

ALTER TABLE "inventory_balances"
ADD CONSTRAINT "inventory_balances_quantity_non_negative"
CHECK ("quantity" >= 0);
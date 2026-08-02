-- Per-item delivery, so a cashier can hand over what has reached the counter
-- and leave the rest outstanding.

ALTER TYPE "Status" ADD VALUE 'PARTIALLY_DELIVERED';

ALTER TABLE "Order_Lines" ADD COLUMN "delivered" BOOLEAN NOT NULL DEFAULT false;

-- Orders already completed under the old all-or-nothing rule had every item
-- handed to the customer; without this they would look entirely undelivered.
-- (Reads only the pre-existing DELIVERED value, never the one added above, so
-- it is safe inside the same transaction.)
UPDATE "Order_Lines" l
SET "delivered" = true
FROM "Orders" o
WHERE o."id" = l."order_ref_id" AND o."status" = 'DELIVERED';

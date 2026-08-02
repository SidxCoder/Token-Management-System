-- Replace the handed_over/delivered boolean pair with an explicit per-item
-- stage. The pair could not distinguish "with the runner" from "at the
-- counter", which forced a one-batch-at-a-time restriction on handovers.

CREATE TYPE "LineStage" AS ENUM ('PACKING', 'RELEASED', 'WITH_RUNNER', 'AT_COUNTER', 'DELIVERED');

ALTER TABLE "Order_Lines" ADD COLUMN "stage" "LineStage" NOT NULL DEFAULT 'PACKING';

-- Backfill before dropping the old columns, so nothing in flight is lost.
-- An in-flight line's precise stage is only recoverable from its order status.
UPDATE "Order_Lines" l
SET "stage" = CASE
  WHEN l."delivered" THEN 'DELIVERED'::"LineStage"
  WHEN l."handed_over" AND o."status" = 'READY_FOR_PICKUP' THEN 'AT_COUNTER'::"LineStage"
  WHEN l."handed_over" AND o."status" = 'HANDOVER' THEN 'WITH_RUNNER'::"LineStage"
  WHEN l."handed_over" AND o."status" = 'DELIVERED' THEN 'DELIVERED'::"LineStage"
  WHEN l."handed_over" THEN 'RELEASED'::"LineStage"
  ELSE 'PACKING'::"LineStage"
END
FROM "Orders" o
WHERE o."id" = l."order_ref_id";

ALTER TABLE "Order_Lines" DROP COLUMN "delivered", DROP COLUMN "handed_over";

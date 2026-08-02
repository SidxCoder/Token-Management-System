-- Rollback of 20260802093836_per_line_stage, at the user's request.
--
-- Returns Order_Lines to the single `handed_over` boolean. Prisma's generated
-- diff would have added the column with DEFAULT false and dropped `stage`
-- outright, flattening every in-flight and delivered item back to "in packing".
-- Backfilling first preserves what can still be represented.
--
-- Lossy by nature: the old boolean cannot distinguish RELEASED / WITH_RUNNER /
-- AT_COUNTER / DELIVERED. All four collapse to handed_over = true; the order's
-- own status remains the only record of how far a batch got.

ALTER TABLE "Order_Lines" ADD COLUMN "handed_over" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Order_Lines" SET "handed_over" = true WHERE "stage" <> 'PACKING';

ALTER TABLE "Order_Lines" DROP COLUMN "stage";

DROP TYPE "LineStage";

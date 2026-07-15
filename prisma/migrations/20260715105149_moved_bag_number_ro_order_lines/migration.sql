/*
  Warnings:

  - You are about to drop the column `bag_number` on the `Orders` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order_Lines" ADD COLUMN     "bag_number" INTEGER,
ADD COLUMN     "sku_code" TEXT,
ADD COLUMN     "sku_description" TEXT;

-- AlterTable
ALTER TABLE "Orders" DROP COLUMN "bag_number";

-- AlterTable
ALTER TABLE "Orders" ADD COLUMN     "cashier_id" TEXT,
ADD COLUMN     "ready_at" TIMESTAMP(3),
ADD COLUMN     "runner_id" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "station_number" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "User_role_station_number_key" ON "User"("role", "station_number");

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_runner_id_fkey" FOREIGN KEY ("runner_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_cashier_id_fkey" FOREIGN KEY ("cashier_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


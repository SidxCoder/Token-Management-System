-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('M', 'F');

-- CreateEnum
CREATE TYPE "CycleStatus" AS ENUM ('OPEN', 'FROZEN');

-- CreateEnum
CREATE TYPE "ShiftKind" AS ENUM ('SHIFT', 'WEEKLY_OFF', 'LEAVE', 'HOLIDAY');

-- CreateEnum
CREATE TYPE "RegularisationType" AS ENUM ('MISSED_PUNCH', 'DEVICE_FAILURE', 'OUTDOOR_DUTY', 'TIME_EXCEPTION');

-- CreateEnum
CREATE TYPE "RegularisationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DayOutcome" AS ENUM ('PRESENT', 'EXCUSED', 'LATE', 'HALF_DAY', 'FULL_DAY_LEAVE', 'MISSED_PUNCH_PENDING', 'ABSENT', 'WEEKLY_OFF', 'LEAVE', 'HOLIDAY');

-- CreateEnum
CREATE TYPE "Deduction" AS ENUM ('NONE', 'HALF_LEAVE', 'FULL_LEAVE', 'UNPAID');

-- CreateEnum
CREATE TYPE "LateSeverity" AS ENUM ('MINOR', 'MAJOR');

-- CreateEnum
CREATE TYPE "DisciplinaryKind" AS ENUM ('WARNING_1', 'WARNING_2', 'SHOW_CAUSE', 'MISSED_PUNCH_CAUTION');

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "emp_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "task" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance_Cycle" (
    "id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "CycleStatus" NOT NULL DEFAULT 'OPEN',
    "frozen_by" TEXT,
    "frozen_at" TIMESTAMP(3),

    CONSTRAINT "Attendance_Cycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Roster_Shift" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "kind" "ShiftKind" NOT NULL,
    "start_min" INTEGER,
    "end_min" INTEGER,
    "is_opening" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Roster_Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Punch" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "in_min" INTEGER,
    "out_min" INTEGER,
    "upload_batch_id" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Punch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Regularisation" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "RegularisationType" NOT NULL,
    "in_min" INTEGER,
    "out_min" INTEGER,
    "note" TEXT NOT NULL,
    "status" "RegularisationStatus" NOT NULL DEFAULT 'PENDING',
    "requested_by" TEXT NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_by" TEXT,
    "decided_at" TIMESTAMP(3),

    CONSTRAINT "Regularisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance_Day" (
    "id" TEXT NOT NULL,
    "cycle_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "outcome" "DayOutcome" NOT NULL,
    "deduction" "Deduction" NOT NULL,
    "severity" "LateSeverity",
    "occurrence_no" INTEGER,
    "start_min" INTEGER,
    "end_min" INTEGER,
    "in_min" INTEGER,
    "out_min" INTEGER,
    "missed_punch" BOOLEAN NOT NULL,
    "late_minutes" INTEGER NOT NULL,
    "early_minutes" INTEGER NOT NULL,
    "span_minutes" INTEGER NOT NULL,
    "reasons" JSONB NOT NULL,

    CONSTRAINT "Attendance_Day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disciplinary_Record" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "cycle_id" TEXT NOT NULL,
    "kind" "DisciplinaryKind" NOT NULL,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Disciplinary_Record_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_emp_code_key" ON "Employee"("emp_code");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_Cycle_start_date_key" ON "Attendance_Cycle"("start_date");

-- CreateIndex
CREATE UNIQUE INDEX "Roster_Shift_employee_id_date_key" ON "Roster_Shift"("employee_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Punch_employee_id_date_key" ON "Punch"("employee_id", "date");

-- CreateIndex
CREATE INDEX "Regularisation_employee_id_date_idx" ON "Regularisation"("employee_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_Day_employee_id_date_key" ON "Attendance_Day"("employee_id", "date");

-- AddForeignKey
ALTER TABLE "Attendance_Cycle" ADD CONSTRAINT "Attendance_Cycle_frozen_by_fkey" FOREIGN KEY ("frozen_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Roster_Shift" ADD CONSTRAINT "Roster_Shift_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Punch" ADD CONSTRAINT "Punch_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Regularisation" ADD CONSTRAINT "Regularisation_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Regularisation" ADD CONSTRAINT "Regularisation_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Regularisation" ADD CONSTRAINT "Regularisation_decided_by_fkey" FOREIGN KEY ("decided_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance_Day" ADD CONSTRAINT "Attendance_Day_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "Attendance_Cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance_Day" ADD CONSTRAINT "Attendance_Day_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disciplinary_Record" ADD CONSTRAINT "Disciplinary_Record_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disciplinary_Record" ADD CONSTRAINT "Disciplinary_Record_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "Attendance_Cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

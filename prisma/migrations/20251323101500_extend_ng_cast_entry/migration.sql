-- CreateEnum
CREATE TYPE "NgAssignmentSource" AS ENUM ('customer', 'cast', 'staff');

-- AlterTable
ALTER TABLE "NgCastEntry"
ADD COLUMN     "assignedBy" "NgAssignmentSource" NOT NULL DEFAULT 'customer',
ADD COLUMN     "notes" TEXT;

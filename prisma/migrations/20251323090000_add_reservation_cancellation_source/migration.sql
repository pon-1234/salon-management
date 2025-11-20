-- CreateEnum
CREATE TYPE "CancellationSource" AS ENUM ('customer', 'store');

-- AlterTable
ALTER TABLE "Reservation"
ADD COLUMN     "cancellationSource" "CancellationSource";

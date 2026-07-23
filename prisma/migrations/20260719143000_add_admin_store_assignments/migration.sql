-- Explicitly scope non-super-admin accounts to authorized stores.
CREATE TABLE "AdminStoreAssignment" (
    "adminId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminStoreAssignment_pkey" PRIMARY KEY ("adminId", "storeId")
);

CREATE INDEX "AdminStoreAssignment_storeId_idx" ON "AdminStoreAssignment"("storeId");

ALTER TABLE "AdminStoreAssignment"
ADD CONSTRAINT "AdminStoreAssignment_adminId_fkey"
FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdminStoreAssignment"
ADD CONSTRAINT "AdminStoreAssignment_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

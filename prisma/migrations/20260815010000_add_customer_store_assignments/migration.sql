BEGIN;

LOCK TABLE "Customer", "Reservation", "Store" IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE "CustomerStoreAssignment" (
    "customerId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerStoreAssignment_pkey" PRIMARY KEY ("customerId", "storeId")
);

CREATE INDEX "CustomerStoreAssignment_storeId_idx"
ON "CustomerStoreAssignment"("storeId");

ALTER TABLE "CustomerStoreAssignment"
ADD CONSTRAINT "CustomerStoreAssignment_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerStoreAssignment"
ADD CONSTRAINT "CustomerStoreAssignment_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reservation history is direct evidence that a customer belongs to a store. A customer can
-- therefore receive more than one assignment without duplicating the customer identity.
INSERT INTO "CustomerStoreAssignment" ("customerId", "storeId")
SELECT DISTINCT reservation."customerId", reservation."storeId"
FROM "Reservation" AS reservation
INNER JOIN "Customer" AS customer ON customer."id" = reservation."customerId"
INNER JOIN "Store" AS store ON store."id" = reservation."storeId"
ON CONFLICT ("customerId", "storeId") DO NOTHING;

-- Customers without reservation evidence are assigned only when the database contains exactly
-- one store. Multi-store databases intentionally leave ambiguous rows unassigned so APIs fail
-- closed instead of exposing them to an arbitrary store.
WITH sole_store AS (
    SELECT MIN("id") AS "storeId"
    FROM "Store"
    HAVING COUNT(*) = 1
)
INSERT INTO "CustomerStoreAssignment" ("customerId", "storeId")
SELECT customer."id", sole_store."storeId"
FROM "Customer" AS customer
CROSS JOIN sole_store
WHERE NOT EXISTS (
    SELECT 1
    FROM "CustomerStoreAssignment" AS assignment
    WHERE assignment."customerId" = customer."id"
)
ON CONFLICT ("customerId", "storeId") DO NOTHING;

COMMIT;

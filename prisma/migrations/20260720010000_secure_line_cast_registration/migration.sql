BEGIN;

-- Hold cast writes until the preflight and unique index are both complete.
LOCK TABLE "Cast" IN SHARE ROW EXCLUSIVE MODE;

-- Fail closed if historical data contains blank, unnormalized, or duplicate LINE IDs.
-- No legacy row is modified or deleted by this preflight check.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Cast"
    WHERE "lineUserId" IS NOT NULL
      AND btrim("lineUserId") = ''
  ) THEN
    RAISE EXCEPTION 'Cannot enforce unique LINE cast links: blank Cast.lineUserId values exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "Cast"
    WHERE "lineUserId" IS NOT NULL
      AND "lineUserId" <> btrim("lineUserId")
  ) THEN
    RAISE EXCEPTION 'Cannot enforce unique LINE cast links: unnormalized Cast.lineUserId values exist';
  END IF;

  IF EXISTS (
    SELECT btrim("lineUserId")
    FROM "Cast"
    WHERE "lineUserId" IS NOT NULL
    GROUP BY btrim("lineUserId")
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce unique LINE cast links: normalized duplicate Cast.lineUserId values exist';
  END IF;
END
$$;

ALTER TABLE "Cast"
  ADD CONSTRAINT "Cast_lineUserId_normalized_check"
  CHECK (
    "lineUserId" IS NULL
    OR ("lineUserId" = btrim("lineUserId") AND "lineUserId" <> '')
  );

CREATE UNIQUE INDEX "Cast_lineUserId_key" ON "Cast"("lineUserId");

CREATE TABLE "CastLineRegistrationToken" (
  "id" TEXT NOT NULL,
  "castId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdByAdminId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CastLineRegistrationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CastLineRegistrationToken_castId_key"
  ON "CastLineRegistrationToken"("castId");
CREATE UNIQUE INDEX "CastLineRegistrationToken_tokenHash_key"
  ON "CastLineRegistrationToken"("tokenHash");
CREATE INDEX "CastLineRegistrationToken_storeId_idx"
  ON "CastLineRegistrationToken"("storeId");
CREATE INDEX "CastLineRegistrationToken_expiresAt_idx"
  ON "CastLineRegistrationToken"("expiresAt");

ALTER TABLE "CastLineRegistrationToken"
  ADD CONSTRAINT "CastLineRegistrationToken_castId_fkey"
  FOREIGN KEY ("castId") REFERENCES "Cast"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CastLineRegistrationToken"
  ADD CONSTRAINT "CastLineRegistrationToken_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CastLineRegistrationToken"
  ADD CONSTRAINT "CastLineRegistrationToken_createdByAdminId_fkey"
  FOREIGN KEY ("createdByAdminId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;

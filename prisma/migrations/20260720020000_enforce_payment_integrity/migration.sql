/**
 * @design_doc   Reservation-bound payment transaction integrity
 * @related_to   PaymentTransaction, Customer, Reservation
 * @known_issues Apply during a maintenance window because PaymentTransaction is write-locked
 */

BEGIN;

-- Keep the preflight snapshot and the constraints atomic with respect to writes.
LOCK TABLE "PaymentTransaction" IN SHARE ROW EXCLUSIVE MODE;

-- Fail closed. Historical conflicts must be reviewed and reconciled explicitly;
-- this migration never chooses a winning row or mutates legacy data.
DO $$
BEGIN
  IF EXISTS (
    SELECT "reservationId"
    FROM "PaymentTransaction"
    WHERE "reservationId" IS NOT NULL
      AND "type" = 'payment'
      AND "status" IN ('pending', 'processing', 'completed')
    GROUP BY "reservationId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce active payment uniqueness: duplicate reservation payments exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "PaymentTransaction" AS payment
    LEFT JOIN "Customer" AS customer ON customer."id" = payment."customerId"
    WHERE payment."customerId" IS NOT NULL
      AND customer."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add PaymentTransaction.customerId foreign key: orphan rows exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "PaymentTransaction" AS payment
    LEFT JOIN "Reservation" AS reservation ON reservation."id" = payment."reservationId"
    WHERE payment."reservationId" IS NOT NULL
      AND reservation."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add PaymentTransaction.reservationId foreign key: orphan rows exist';
  END IF;
END
$$;

CREATE UNIQUE INDEX "PaymentTransaction_one_active_payment_per_reservation"
  ON "PaymentTransaction"("reservationId")
  WHERE "reservationId" IS NOT NULL
    AND "type" = 'payment'
    AND "status" IN ('pending', 'processing', 'completed');

CREATE INDEX "PaymentTransaction_customerId_idx"
  ON "PaymentTransaction"("customerId");
CREATE INDEX "PaymentTransaction_reservationId_idx"
  ON "PaymentTransaction"("reservationId");

ALTER TABLE "PaymentTransaction"
  ADD CONSTRAINT "PaymentTransaction_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentTransaction"
  ADD CONSTRAINT "PaymentTransaction_reservationId_fkey"
  FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;

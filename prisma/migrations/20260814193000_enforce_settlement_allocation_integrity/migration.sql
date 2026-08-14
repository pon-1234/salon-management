BEGIN;

/**
 * @design_doc   One reservation may belong to only one cast settlement payment
 * @related_to   SettlementPaymentReservation, lib/settlement/server.ts
 * @known_issues Conflicting historical allocations must be reconciled explicitly before migration
 */

LOCK TABLE "SettlementPaymentReservation" IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (
    SELECT "reservationId"
    FROM "SettlementPaymentReservation"
    GROUP BY "reservationId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce settlement allocation uniqueness: duplicate reservation allocations exist';
  END IF;
END
$$;

CREATE UNIQUE INDEX "SettlementPaymentReservation_reservationId_key"
  ON "SettlementPaymentReservation"("reservationId");

COMMIT;

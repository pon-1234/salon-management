/**
 * @design_doc   Point ledger idempotency for reservation events
 * @related_to   CustomerPointHistory and reservation completion/booking transactions
 * @known_issues Existing duplicates must be reconciled explicitly before this migration can run
 */
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "CustomerPointHistory"
    WHERE "reservationId" IS NOT NULL
    GROUP BY "reservationId", "type"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate reservation point events must be reconciled before migration';
  END IF;
END
$$;

CREATE UNIQUE INDEX "unique_reservation_point_event" ON "CustomerPointHistory"("reservationId", "type");

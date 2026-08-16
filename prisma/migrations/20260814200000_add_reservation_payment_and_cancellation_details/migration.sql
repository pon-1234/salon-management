/**
 * @design_doc   Preserve non-sensitive card receipt references and operator cancellation reasons
 * @related_to   Reservation, reservation administrator workflows
 * @known_issues Existing rows remain null until explicitly reviewed or migrated
 */

ALTER TABLE "Reservation"
  ADD COLUMN "paymentReference" TEXT,
  ADD COLUMN "cancellationReason" TEXT;

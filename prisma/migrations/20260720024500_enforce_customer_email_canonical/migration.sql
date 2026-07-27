BEGIN;

-- @design_doc   Canonical Customer.email database boundary for authentication identity
-- @related_to   Registration, login, verification, password recovery, and legacy import
-- @known_issues Deployment requires explicit cleanup if preflight reports legacy conflicts

LOCK TABLE "Customer" IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT lower(btrim("email")) AS normalized_email
      FROM "Customer"
      GROUP BY lower(btrim("email"))
      HAVING COUNT(*) > 1
    ) AS duplicate_customer_emails
  ) THEN
    RAISE EXCEPTION 'Customer email migration blocked: case-insensitive duplicates require explicit resolution';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "Customer"
    WHERE "email" <> lower(btrim("email"))
       OR btrim("email") = ''
  ) THEN
    RAISE EXCEPTION 'Customer email migration blocked: non-canonical emails require explicit normalization';
  END IF;
END
$$;

ALTER TABLE "Customer"
  ADD CONSTRAINT "Customer_email_canonical_check"
  CHECK ("email" = lower(btrim("email")) AND btrim("email") <> '');

COMMIT;

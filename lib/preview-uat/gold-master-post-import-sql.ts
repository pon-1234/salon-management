/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md V5 post-import reconciliation
 * @related_to   gold-master-verification.ts supplies the approved redacted expectations
 * @known_issues PostgreSQL SQL validates counts, aggregates, relations, and migrations; fixture all-field SHA remains a JS-side control
 */
import { PREVIEW_UAT_EMPTY_TABLES } from './setup'
import {
  parseGoldMasterPreviewVerificationControl,
  type GoldMasterPreviewVerificationControl,
} from './gold-master-verification'

/** Renders a deterministic read-only psql script from one already approved control. */
export function buildGoldMasterPostImportSql(input: GoldMasterPreviewVerificationControl): string {
  const control = parseGoldMasterPreviewVerificationControl(input)
  const expectedCounts = PREVIEW_UAT_EMPTY_TABLES.map((model) => {
    const expected = control.models[model]
    if (!expected) throw new Error('GOLD_MASTER_POST_IMPORT_SQL_REJECTED')
    return `        (${sqlLiteral(model)}, ${expected.count}::bigint)`
  }).join(',\n')
  const expectedMigrations =
    control.migrations.entries.length > 0
      ? `VALUES\n${control.migrations.entries
          .map(
            (migration) =>
              `        (${sqlLiteral(migration.name)}, ${sqlLiteral(migration.sha256)})`
          )
          .join(',\n')}`
      : `SELECT NULL::text AS migration_name, NULL::text AS checksum WHERE false`
  const aggregateChecks = renderAggregateChecks(control)

  return `\\set ON_ERROR_STOP on

BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '10min';
SET LOCAL lock_timeout = '10s';

DO $verify$
DECLARE
  item record;
  actual bigint;
BEGIN
  IF current_setting('salon.environment', true) IS DISTINCT FROM 'staging-preview' THEN
    RAISE EXCEPTION 'preview environment identity mismatch';
  END IF;

  FOR item IN
    SELECT *
    FROM (
      VALUES
${expectedCounts}
    ) AS expected_counts(table_name, expected_count)
  LOOP
    EXECUTE format('SELECT count(*) FROM %I', item.table_name) INTO actual;
    IF actual <> item.expected_count THEN
      RAISE EXCEPTION 'table count mismatch for %', item.table_name;
    END IF;
  END LOOP;

  WITH expected(migration_name, checksum) AS (
${expectedMigrations}
  ), successful AS (
    SELECT migration_name, checksum
    FROM "_prisma_migrations"
    WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
  ), differences AS (
    (SELECT migration_name, checksum FROM expected
      EXCEPT SELECT migration_name, checksum FROM successful)
    UNION ALL
    (SELECT migration_name, checksum FROM successful
      EXCEPT SELECT migration_name, checksum FROM expected)
  )
  SELECT count(*) INTO actual FROM differences;
  IF actual <> 0 THEN
    RAISE EXCEPTION 'Prisma migration name/checksum set mismatch';
  END IF;

  SELECT count(*) INTO actual
  FROM "_prisma_migrations"
  WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL;
  IF actual <> 0 THEN
    RAISE EXCEPTION 'incomplete or rolled-back Prisma migration rows exist';
  END IF;

  SELECT count(*) INTO actual
  FROM pg_constraint
  WHERE contype = 'f' AND NOT convalidated;
  IF actual <> 0 THEN
    RAISE EXCEPTION 'unvalidated foreign-key constraints exist';
  END IF;

  SELECT count(*) INTO actual
  FROM "HotelSettings"
  WHERE NOT "isActive";
  IF actual <> 0 THEN
    RAISE EXCEPTION 'active hotel count mismatch';
  END IF;

  SELECT count(*) INTO actual
  FROM "Reservation" r
  LEFT JOIN "Customer" customer ON customer."id" = r."customerId"
  LEFT JOIN "Cast" c ON c."id" = r."castId"
  LEFT JOIN "CoursePrice" course ON course."id" = r."courseId"
  LEFT JOIN "Store" store ON store."id" = r."storeId"
  LEFT JOIN "AreaInfo" area ON area."id" = r."areaId"
  LEFT JOIN "StationInfo" station ON station."id" = r."stationId"
  LEFT JOIN "HotelSettings" hotel
    ON hotel."id" = r."hotelId" AND hotel."storeId" = r."storeId"
  WHERE customer."id" IS NULL
     OR c."id" IS NULL
     OR course."id" IS NULL
     OR store."id" IS NULL
     OR c."storeId" <> r."storeId"
     OR course."storeId" <> r."storeId"
     OR (r."areaId" IS NOT NULL AND (area."id" IS NULL OR area."storeId" <> r."storeId"))
     OR (r."stationId" IS NOT NULL AND (station."id" IS NULL OR station."storeId" <> r."storeId"))
     OR (r."hotelId" IS NOT NULL AND hotel."id" IS NULL)
     OR (r."areaId" IS NOT NULL AND r."stationId" IS NOT NULL AND station."areaId" <> r."areaId");
  IF actual <> 0 THEN
    RAISE EXCEPTION 'reservation relation or store isolation mismatch';
  END IF;

  SELECT count(*) INTO actual
  FROM "ReservationOption" ro
  LEFT JOIN "Reservation" r ON r."id" = ro."reservationId"
  LEFT JOIN "OptionPrice" option ON option."id" = ro."optionId"
  WHERE r."id" IS NULL OR option."id" IS NULL OR r."storeId" <> option."storeId";
  IF actual <> 0 THEN
    RAISE EXCEPTION 'reservation option relation mismatch';
  END IF;

  SELECT count(*) INTO actual
  FROM "CastOptionSetting" setting
  LEFT JOIN "Cast" c ON c."id" = setting."castId"
  LEFT JOIN "OptionPrice" option ON option."id" = setting."optionId"
  WHERE c."id" IS NULL OR option."id" IS NULL OR c."storeId" <> option."storeId";
  IF actual <> 0 THEN
    RAISE EXCEPTION 'cast option relation mismatch';
  END IF;

  SELECT count(*) INTO actual
  FROM "CastSchedule" schedule
  LEFT JOIN "Cast" c ON c."id" = schedule."castId"
  WHERE c."id" IS NULL OR schedule."endTime" <= schedule."startTime";
  IF actual <> 0 THEN
    RAISE EXCEPTION 'cast schedule relation or time mismatch';
  END IF;

  SELECT count(*) INTO actual
  FROM "Review" review
  LEFT JOIN "Customer" customer ON customer."id" = review."customerId"
  LEFT JOIN "Cast" c ON c."id" = review."castId"
  LEFT JOIN "Reservation" r ON r."id" = review."reservationId"
  WHERE customer."id" IS NULL
     OR c."id" IS NULL
     OR (review."reservationId" IS NOT NULL AND r."id" IS NULL)
     OR review."rating" NOT BETWEEN 1 AND 5;
  IF actual <> 0 THEN
    RAISE EXCEPTION 'review relation or rating mismatch';
  END IF;

  SELECT count(*) INTO actual
  FROM "AdminStoreAssignment" assignment
  LEFT JOIN "Admin" admin ON admin."id" = assignment."adminId"
  LEFT JOIN "Store" store ON store."id" = assignment."storeId"
  WHERE admin."id" IS NULL OR store."id" IS NULL;
  IF actual <> 0 THEN
    RAISE EXCEPTION 'administrator assignment relation mismatch';
  END IF;

  SELECT count(*) INTO actual
  FROM "Customer"
  WHERE "email" <> lower("email")
     OR "phone" !~ '^[0-9]{10,11}$'
     OR "smsEnabled"
     OR "emailNotificationEnabled"
     OR "password" !~ '^[$]2[aby][$][0-9]{2}[$]';
  IF actual <> 0 THEN
    RAISE EXCEPTION 'customer credential or outbound safety mismatch';
  END IF;

  SELECT count(*) INTO actual
  FROM "Reservation"
  WHERE "endTime" <= "startTime"
     OR "price" < 0
     OR "designationFee" < 0
     OR "transportationFee" < 0
     OR "additionalFee" < 0
     OR "hotelExpense" < 0
     OR "discountAmount" < 0
     OR "welfareExpense" < 0
     OR "pointsUsed" < 0
     OR "storeRevenue" < 0
     OR "staffRevenue" < 0
     OR "paymentReference" IS NOT NULL
     OR "cancellationSource" IS NOT NULL
     OR "cancellationReason" IS NOT NULL;
  IF actual <> 0 THEN
    RAISE EXCEPTION 'reservation value or preview-null invariant mismatch';
  END IF;

  SELECT count(*) INTO actual
  FROM "ReservationOption"
  WHERE "optionPrice" < 0 OR "storeShare" < 0 OR "castShare" < 0
     OR coalesce("storeShare", 0) + coalesce("castShare", 0) <> "optionPrice";
  IF actual <> 0 THEN
    RAISE EXCEPTION 'reservation option monetary invariant mismatch';
  END IF;

  SELECT count(*) INTO actual
  FROM "Cast", LATERAL unnest("images") AS image_url
  WHERE image_url LIKE '/salon-uploads/%';
  IF actual <> ${control.images.fileCount} THEN
    RAISE EXCEPTION 'cast image reference count mismatch';
  END IF;

  SELECT count(DISTINCT image_url) INTO actual
  FROM "Cast", LATERAL unnest("images") AS image_url
  WHERE image_url LIKE '/salon-uploads/%';
  IF actual <> ${control.images.fileCount} THEN
    RAISE EXCEPTION 'cast image reference uniqueness mismatch';
  END IF;

  SELECT count(*) INTO actual
  FROM "Cast"
  WHERE "image" <> "images"[1]
     OR EXISTS (
       SELECT 1
       FROM unnest("images") AS image_url
       WHERE image_url <> '/images/non-photo.svg'
         AND image_url NOT LIKE '/salon-uploads/casts/ikebukuro/%'
     );
  IF actual <> 0 THEN
    RAISE EXCEPTION 'cast image URL invariant mismatch';
  END IF;

${aggregateChecks}

  RAISE NOTICE 'V5_FULL_DATABASE_RECONCILIATION_OK';
END
$verify$;

ROLLBACK;
`
}

function renderAggregateChecks(control: GoldMasterPreviewVerificationControl): string {
  const customer = control.aggregates.customers
  const reservation = control.aggregates.reservations
  const reservationOption = control.aggregates.reservationOptions
  const course = control.aggregates.courses
  const option = control.aggregates.options
  const schedule = control.aggregates.schedules
  const review = control.aggregates.reviews

  return [
    countCheck('"Customer"', '"accountStatus" = \'active\'', customer.active, 'customer.active'),
    countCheck('"Customer"', '"accountStatus" = \'blocked\'', customer.blocked, 'customer.blocked'),
    countCheck('"Customer"', '"accountStatus" = \'pending\'', customer.pending, 'customer.pending'),
    countCheck(
      '"Customer"',
      '"accountStatus" = \'withdrawn\'',
      customer.withdrawn,
      'customer.withdrawn'
    ),
    countCheck('"Customer"', '"accountStatus" = \'unknown\'', customer.unknown, 'customer.unknown'),
    countCheck(
      '"Customer"',
      '"membershipStage" = \'regular\'',
      customer.regularStage,
      'customer.stage.regular'
    ),
    countCheck(
      '"Customer"',
      '"membershipStage" = \'silver\'',
      customer.silverStage,
      'customer.stage.silver'
    ),
    countCheck(
      '"Customer"',
      '"membershipStage" = \'gold\'',
      customer.goldStage,
      'customer.stage.gold'
    ),
    countCheck(
      '"Customer"',
      '"membershipStage" = \'platinum\'',
      customer.platinumStage,
      'customer.stage.platinum'
    ),
    countCheck(
      '"Customer"',
      '"membershipStage" = \'god\'',
      customer.godStage,
      'customer.stage.god'
    ),
    countCheck(
      '"Customer"',
      '"memberType" = \'regular\'',
      customer.regularMember,
      'customer.member.regular'
    ),
    countCheck('"Customer"', '"memberType" = \'vip\'', customer.vipMember, 'customer.member.vip'),
    sumCheck('"Customer"', '"points"', customer.points, 'customer.points'),
    countCheck('"Customer"', '"lastLoginAt" IS NOT NULL', customer.lastLogin, 'customer.lastLogin'),
    countCheck('"Customer"', '"lastVisitAt" IS NOT NULL', customer.lastVisit, 'customer.lastVisit'),
    countCheck('"Customer"', '"emailVerified"', customer.emailVerified, 'customer.emailVerified'),
    distinctCheck('"Customer"', '"phone"', customer.distinctPhones, 'customer.distinctPhones'),
    distinctCheck('"Customer"', '"email"', customer.distinctEmails, 'customer.distinctEmails'),
    countCheck(
      '"Reservation"',
      '"status" = \'completed\'',
      reservation.completed,
      'reservation.completed'
    ),
    countCheck(
      '"Reservation"',
      '"status" = \'confirmed\'',
      reservation.confirmed,
      'reservation.confirmed'
    ),
    countCheck(
      '"Reservation"',
      '"status" = \'pending\'',
      reservation.pending,
      'reservation.pending'
    ),
    countCheck(
      '"Reservation"',
      '"status" = \'cancelled\'',
      reservation.cancelled,
      'reservation.cancelled'
    ),
    countCheck(
      '"Reservation"',
      '"settlementStatus" = \'pending\'',
      reservation.settlementPending,
      'reservation.settlementPending'
    ),
    countCheck('"Reservation"', '"paymentMethod" = \'現金\'', reservation.cash, 'reservation.cash'),
    countCheck(
      '"Reservation"',
      '"paymentMethod" = \'クレジットカード\'',
      reservation.creditCard,
      'reservation.creditCard'
    ),
    countCheck(
      '"Reservation"',
      '"designationType" IS NULL',
      reservation.designationNone,
      'reservation.designationNone'
    ),
    countCheck(
      '"Reservation"',
      '"designationType" = \'panel\'',
      reservation.designationPanel,
      'reservation.designationPanel'
    ),
    countCheck(
      '"Reservation"',
      '"designationType" = \'regular\'',
      reservation.designationRegular,
      'reservation.designationRegular'
    ),
    sumCheck('"Reservation"', '"price"', reservation.price, 'reservation.price'),
    sumCheck(
      '"Reservation"',
      '"storeRevenue"',
      reservation.storeRevenue,
      'reservation.storeRevenue'
    ),
    sumCheck(
      '"Reservation"',
      '"staffRevenue"',
      reservation.staffRevenue,
      'reservation.staffRevenue'
    ),
    sumCheck(
      '"Reservation"',
      '"designationFee"',
      reservation.designationFee,
      'reservation.designationFee'
    ),
    sumCheck(
      '"Reservation"',
      '"transportationFee"',
      reservation.transportationFee,
      'reservation.transportationFee'
    ),
    sumCheck(
      '"Reservation"',
      '"additionalFee"',
      reservation.additionalFee,
      'reservation.additionalFee'
    ),
    sumCheck(
      '"Reservation"',
      '"hotelExpense"',
      reservation.hotelExpense,
      'reservation.hotelExpense'
    ),
    sumCheck(
      '"Reservation"',
      '"discountAmount"',
      reservation.discountAmount,
      'reservation.discountAmount'
    ),
    sumCheck(
      '"Reservation"',
      '"welfareExpense"',
      reservation.welfareExpense,
      'reservation.welfareExpense'
    ),
    sumCheck('"Reservation"', '"pointsUsed"', reservation.pointsUsed, 'reservation.pointsUsed'),
    sumCheck(
      '"ReservationOption"',
      '"optionPrice"',
      reservationOption.price,
      'reservationOption.price'
    ),
    sumCheck(
      '"ReservationOption"',
      '"storeShare"',
      reservationOption.storeShare,
      'reservationOption.storeShare'
    ),
    sumCheck(
      '"ReservationOption"',
      '"castShare"',
      reservationOption.castShare,
      'reservationOption.castShare'
    ),
    sumCheck('"CoursePrice"', '"price"', course.price, 'course.price'),
    sumCheck('"CoursePrice"', '"storeShare"', course.storeShare, 'course.storeShare'),
    sumCheck('"CoursePrice"', '"castShare"', course.castShare, 'course.castShare'),
    sumCheck('"OptionPrice"', '"price"', option.price, 'option.price'),
    sumCheck('"OptionPrice"', '"storeShare"', option.storeShare, 'option.storeShare'),
    sumCheck('"OptionPrice"', '"castShare"', option.castShare, 'option.castShare'),
    countCheck('"CastSchedule"', '"isAvailable"', schedule.available, 'schedule.available'),
    countCheck('"CastSchedule"', 'NOT "isAvailable"', schedule.unavailable, 'schedule.unavailable'),
    countCheck('"Review"', '"status" = \'published\'', review.published, 'review.published'),
  ].join('\n\n')
}

function countCheck(table: string, predicate: string, expected: number, label: string): string {
  return `  SELECT count(*) INTO actual FROM ${table} WHERE ${predicate};
  IF actual <> ${expected} THEN RAISE EXCEPTION ${sqlLiteral(`${label} mismatch`)}; END IF;`
}

function distinctCheck(table: string, column: string, expected: number, label: string): string {
  return `  SELECT count(DISTINCT ${column}) INTO actual FROM ${table};
  IF actual <> ${expected} THEN RAISE EXCEPTION ${sqlLiteral(`${label} mismatch`)}; END IF;`
}

function sumCheck(table: string, column: string, expected: number, label: string): string {
  return `  SELECT coalesce(sum(${column}), 0) INTO actual FROM ${table};
  IF actual <> ${expected} THEN RAISE EXCEPTION ${sqlLiteral(`${label} mismatch`)}; END IF;`
}

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

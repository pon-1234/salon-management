-- Add versioning support for course and option pricing
ALTER TABLE "CoursePrice"
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

ALTER TABLE "OptionPrice"
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

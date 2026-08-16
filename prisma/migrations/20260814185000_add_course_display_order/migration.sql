-- Preserve the legacy course ordering so extensions do not become the default course.
ALTER TABLE "CoursePrice"
ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;

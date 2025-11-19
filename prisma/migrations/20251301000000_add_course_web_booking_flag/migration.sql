-- Allow specifying whether a course can be booked online
ALTER TABLE "CoursePrice"
ADD COLUMN "enableWebBooking" BOOLEAN NOT NULL DEFAULT true;

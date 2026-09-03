ALTER TABLE "CastSchedule" ADD COLUMN "status" TEXT NOT NULL DEFAULT '出勤予定';
ALTER TABLE "StoreSettings" ADD COLUMN "mediaAccounts" JSONB NOT NULL DEFAULT '[]';

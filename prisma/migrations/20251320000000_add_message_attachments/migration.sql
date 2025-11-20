-- Add attachments column to messages for storing chat image metadata
ALTER TABLE "Message"
ADD COLUMN "attachments" JSONB;

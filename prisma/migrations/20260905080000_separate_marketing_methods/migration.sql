ALTER TABLE "StoreSettings" ADD COLUMN "marketingMethods" TEXT[] NOT NULL DEFAULT ARRAY['店リピート', '電話', '紹介', 'SNS', 'WEB', 'SMS', 'LINE']::TEXT[];

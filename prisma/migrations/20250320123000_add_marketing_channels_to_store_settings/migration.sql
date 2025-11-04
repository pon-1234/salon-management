-- Add marketingChannels array to StoreSettings for configurable marketing master
ALTER TABLE "StoreSettings"
ADD COLUMN "marketingChannels" TEXT[] NOT NULL DEFAULT ARRAY['店リピート', '電話', '紹介', 'SNS', 'WEB', 'Heaven'];

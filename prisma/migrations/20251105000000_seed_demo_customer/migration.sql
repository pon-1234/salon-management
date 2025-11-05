-- Ensure demo customer for fallback login exists
INSERT INTO "Customer" ("id", "name", "nameKana", "phone", "email", "password", "birthDate", "memberType", "points", "createdAt", "updatedAt")
VALUES (
  'demo-tanaka',
  '田中 太郎',
  'タナカ タロウ',
  '08012345678',
  'tanaka@example.com',
  '$2b$10$MN61KzQsfMkLLXuzc6WJk.3EQiUloEgf8xO.FYBbAh02XvDSPYylW',
  '1992-05-12T00:00:00.000Z',
  'vip',
  12500,
  NOW(),
  NOW()
)
ON CONFLICT ("email") DO UPDATE
SET
  "password" = EXCLUDED."password",
  "name" = EXCLUDED."name",
  "nameKana" = EXCLUDED."nameKana",
  "phone" = EXCLUDED."phone",
  "memberType" = EXCLUDED."memberType",
  "points" = EXCLUDED."points",
  "updatedAt" = NOW();

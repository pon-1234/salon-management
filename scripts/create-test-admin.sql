-- Test admin user creation script
-- Password: admin123 (hashed with bcrypt)

INSERT INTO "Admin" (
  id,
  email,
  password,
  name,
  role,
  "isActive",
  "createdAt",
  "updatedAt"
) VALUES (
  'test-admin-1',
  'admin@example.com',
  '$2a$10$XZ7xPm0W8aHiIqBR9cvzq.Ah9V.mRh3TvJXuFCVsA8Cq/8T2nDGDa', -- bcrypt hash of 'admin123'
  'Test Admin',
  'admin',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  "updatedAt" = NOW();
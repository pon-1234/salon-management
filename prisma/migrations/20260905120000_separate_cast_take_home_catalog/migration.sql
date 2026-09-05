-- Preserve customer charges and copy existing cast bonus selections into an internal catalog.
ALTER TABLE "DesignationFee" ADD COLUMN "isTakeHomeBonus" BOOLEAN NOT NULL DEFAULT false;

INSERT INTO "DesignationFee" ("id", "name", "price", "storeShare", "castShare", "description", "sortOrder", "isActive", "kind", "storeId", "createdAt", "updatedAt", "isTakeHomeBonus")
SELECT DISTINCT d."id" || '-bonus-free', d."name" || ' 手取UP', d."price", 0, 0, '既存キャスト設定から移行', d."sortOrder", d."isActive", 'free'::"DesignationFeeKind", d."storeId", NOW(), NOW(), true
FROM "DesignationFee" d JOIN "Cast" c ON c."freeTakeHomeBonusId" = d."id" AND c."storeId" = d."storeId";
UPDATE "Cast" c SET "freeTakeHomeBonusId" = d."id" || '-bonus-free'
FROM "DesignationFee" d WHERE c."freeTakeHomeBonusId" = d."id" AND c."storeId" = d."storeId" AND NOT d."isTakeHomeBonus";

INSERT INTO "DesignationFee" ("id", "name", "price", "storeShare", "castShare", "description", "sortOrder", "isActive", "kind", "storeId", "createdAt", "updatedAt", "isTakeHomeBonus")
SELECT DISTINCT d."id" || '-bonus-panel', d."name" || ' 手取UP', d."price", 0, 0, '既存キャスト設定から移行', d."sortOrder", d."isActive", 'panel'::"DesignationFeeKind", d."storeId", NOW(), NOW(), true
FROM "DesignationFee" d JOIN "Cast" c ON c."panelTakeHomeBonusId" = d."id" AND c."storeId" = d."storeId";
UPDATE "Cast" c SET "panelTakeHomeBonusId" = d."id" || '-bonus-panel'
FROM "DesignationFee" d WHERE c."panelTakeHomeBonusId" = d."id" AND c."storeId" = d."storeId" AND NOT d."isTakeHomeBonus";

INSERT INTO "DesignationFee" ("id", "name", "price", "storeShare", "castShare", "description", "sortOrder", "isActive", "kind", "storeId", "createdAt", "updatedAt", "isTakeHomeBonus")
SELECT DISTINCT d."id" || '-bonus-recommend', d."name" || ' 手取UP', d."price", 0, 0, '既存キャスト設定から移行', d."sortOrder", d."isActive", 'recommend'::"DesignationFeeKind", d."storeId", NOW(), NOW(), true
FROM "DesignationFee" d JOIN "Cast" c ON c."recommendedTakeHomeBonusId" = d."id" AND c."storeId" = d."storeId";
UPDATE "Cast" c SET "recommendedTakeHomeBonusId" = d."id" || '-bonus-recommend'
FROM "DesignationFee" d WHERE c."recommendedTakeHomeBonusId" = d."id" AND c."storeId" = d."storeId" AND NOT d."isTakeHomeBonus";

INSERT INTO "DesignationFee" ("id", "name", "price", "storeShare", "castShare", "description", "sortOrder", "isActive", "kind", "storeId", "createdAt", "updatedAt", "isTakeHomeBonus")
SELECT DISTINCT d."id" || '-bonus-repeat', d."name" || ' 手取UP', d."price", 0, 0, '既存キャスト設定から移行', d."sortOrder", d."isActive", 'repeat'::"DesignationFeeKind", d."storeId", NOW(), NOW(), true
FROM "DesignationFee" d JOIN "Cast" c ON c."regularTakeHomeBonusId" = d."id" AND c."storeId" = d."storeId";
UPDATE "Cast" c SET "regularTakeHomeBonusId" = d."id" || '-bonus-repeat'
FROM "DesignationFee" d WHERE c."regularTakeHomeBonusId" = d."id" AND c."storeId" = d."storeId" AND NOT d."isTakeHomeBonus";

-- These legacy labels represent the separate recommended designation category.
UPDATE "DesignationFee" SET "kind" = 'recommend' WHERE NOT "isTakeHomeBonus" AND "kind" = 'panel' AND "name" IN ('おすすめパネル', 'おすすめP指名', 'おすすめ指名');

/**
 * @design_doc   Persist the phonetic cast name already used by administrator search and forms
 * @related_to   Cast model, app/api/cast/route.ts, components/cast/cast-form.tsx
 * @known_issues Existing rows remain nullable and continue to display the cast name as fallback
 */
ALTER TABLE "Cast" ADD COLUMN "nameKana" TEXT;

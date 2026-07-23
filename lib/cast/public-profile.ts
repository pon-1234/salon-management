/**
 * @design_doc   Public profile JSON is validated at API and server-rendering boundaries
 * @related_to   mapper.ts and lib/store/public-casts.ts
 * @known_issues Incomplete legacy metadata is intentionally hidden until a full profile is saved
 */
import { z } from 'zod'

import type { PublicProfile } from './types'

const publicProfileSchema = z.object({
  bustCup: z.string(),
  bodyType: z.array(z.string()),
  personality: z.array(z.string()),
  availableServices: z.array(z.string()),
  smoking: z.enum(['吸わない', '吸う', '電子タバコ']),
  massageQualification: z.boolean(),
  qualificationDetails: z.array(z.string()),
  homeVisit: z.enum(['NG', 'OK']),
  tattoo: z.enum(['なし', 'ある']),
  bloodType: z.enum(['A', 'B', 'O', 'AB', '秘密']),
  birthplace: z.string(),
  foreignerOk: z.enum(['NG', 'OK']),
  hobbies: z.string(),
  charmPoint: z.string(),
  personalityOneWord: z.string(),
  favoriteType: z.string(),
  favoriteFood: z.string(),
  specialTechnique: z.string(),
  shopMessage: z.string(),
  customerMessage: z.string(),
}) satisfies z.ZodType<PublicProfile>

export function normalizePublicProfile(value: unknown): PublicProfile | null {
  const parsed = publicProfileSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

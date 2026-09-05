/**
 * @design_doc docs/verification/2026-09-05-notion-recheck.md
 * @related_to legacy-profile-refresh - field projection; import-gold-master-ikebukuro-profiles - transactional writer
 * @known_issues Existing public profiles and operator option choices are preserved as a whole
 */
import { z } from 'zod'
import {
  mergeMissingProfileFields,
  projectLegacyCastProfile,
  projectLegacyMedia,
} from './legacy-profile-refresh'
import type { MediaAccountInput } from '@/lib/settings/media-catalog'

const rowSchema = z.record(z.union([z.string(), z.number(), z.null()]))
const snapshotSchema = z.object({
  kind: z.literal('cast-profiles'),
  shopNo: z.literal(5600),
  capturedAt: z.string().refine((value) => Number.isFinite(Date.parse(value))),
  casts: z.array(rowSchema).min(1),
  media: z.array(rowSchema),
})
export type ExistingProfileCast = Record<string, unknown> & {
  id: string
  storeId: string
  updatedAt?: string | Date
}

export function buildProfileRefreshPlan(
  input: unknown,
  existing: ExistingProfileCast[],
  currentMedia: MediaAccountInput[],
  images: Record<string, string[]>,
  reservedEmails: Set<string>
) {
  const snapshot = snapshotSchema.parse(input)
  const projected = snapshot.casts.map(projectLegacyCastProfile)
  if (new Set(projected.map((cast) => cast.id)).size !== projected.length)
    throw new Error('DUPLICATE_SOURCE_CAST')
  if (existing.some((cast) => cast.storeId !== 'uat-ikebukuro')) throw new Error('CROSS_STORE_CAST')
  const emailCounts = new Map<string, number>()
  for (const cast of projected)
    if (cast.loginEmail)
      emailCounts.set(cast.loginEmail, (emailCounts.get(cast.loginEmail) ?? 0) + 1)
  const updates: Array<{
    id: string
    expectedUpdatedAt?: string | Date
    data: Record<string, unknown>
  }> = []
  const creates = [] as Array<
    ReturnType<typeof projectLegacyCastProfile> & {
      storeId: string
      image: string
      images: string[]
      workStatus: string
      panelDesignationRank: number
      regularDesignationRank: number
    }
  >
  let conflictingEmails = 0
  for (const cast of projected) {
    const current = existing.find(({ id }) => id === cast.id)
    if (
      cast.loginEmail &&
      (emailCounts.get(cast.loginEmail)! > 1 ||
        (reservedEmails.has(cast.loginEmail) && current?.loginEmail !== cast.loginEmail))
    ) {
      cast.loginEmail = null
      conflictingEmails++
    }
    const photos = images[cast.id] ?? []
    const prefix = `/salon-uploads/casts/ikebukuro/${cast.id}/`
    if (
      photos.some(
        (url) =>
          !url.startsWith(prefix) ||
          !/^\d{2}-[a-f0-9]{16}\.(jpg|png|webp)$/.test(url.slice(prefix.length))
      )
    )
      throw new Error('UNVERIFIED_PHOTO_PATH')
    if (!current) {
      creates.push({
        ...cast,
        storeId: 'uat-ikebukuro',
        netReservation: false,
        image: photos[0] ?? '/images/cast-placeholder.svg',
        images: photos,
        workStatus: '休み',
        panelDesignationRank: 0,
        regularDesignationRank: 0,
      })
      continue
    }
    const data = mergeMissingProfileFields(current, cast)
    const sourceType = String(
      snapshot.casts.find((row) => `legacy-cast-${row.girl_no}` === cast.id)?.p_type ?? ''
    ).trim()
    if (current.type === sourceType && /^\d+(#\d+)*$/.test(sourceType)) data.type = cast.type
    // Non-null profiles may include intentional removals; never refill them automatically.
    if (current.publicProfile !== null && current.publicProfile !== undefined)
      delete data.publicProfile
    const currentPhotos = Array.isArray(current.images)
      ? current.images.filter((value): value is string => typeof value === 'string')
      : []
    if (photos.length && currentPhotos.every((url) => url.startsWith(prefix))) {
      const slots = new Set(currentPhotos.map((url) => url.slice(prefix.length, prefix.length + 2)))
      const additional = photos.filter(
        (url) => !slots.has(url.slice(prefix.length, prefix.length + 2))
      )
      if (additional.length) data.images = [...currentPhotos, ...additional]
    }
    if (photos.length && (!current.image || String(current.image).includes('cast-placeholder')))
      data.image = photos[0]
    if (Object.keys(data).length)
      updates.push({ id: cast.id, expectedUpdatedAt: current.updatedAt, data })
  }
  const incomingMedia = snapshot.media.map(projectLegacyMedia)
  if (new Set(incomingMedia.map((account) => account.id)).size !== incomingMedia.length)
    throw new Error('DUPLICATE_SOURCE_MEDIA')
  const media = currentMedia.map((account) => ({ ...account }))
  for (const incoming of incomingMedia) {
    const index = media.findIndex(
      (account) =>
        account.id === incoming.id ||
        (account.name.trim() === incoming.name.trim() && account.category === incoming.category)
    )
    if (index < 0) {
      media.push(incoming)
      continue
    }
    const current = media[index]
    media[index] = {
      ...incoming,
      ...Object.fromEntries(
        Object.entries(current).filter(
          ([, value]) => value !== null && value !== undefined && value !== ''
        )
      ),
      id: incoming.id,
    }
  }
  return {
    creates,
    updates,
    media,
    conflictingEmails,
    sourceCastCount: projected.length,
    sourceMediaCount: incomingMedia.length,
    capturedAt: snapshot.capturedAt,
  }
}

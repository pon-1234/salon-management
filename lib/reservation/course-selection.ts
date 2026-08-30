/**
 * @design_doc   Notion #280 three-slot course selection
 * @related_to   QuickBookingDialog and reservation API canonical pricing
 * @known_issues Legacy reservations without courseItems use their primary course relation
 */

export const MAX_RESERVATION_COURSES = 3

export type ReservationCourseRecord = {
  id: string
  name: string
  duration: number
  price: number
  storeShare?: number | null
  castShare?: number | null
}

export type ReservationCourseItem = ReservationCourseRecord & {
  sortOrder: number
}

type CourseCatalogClient = {
  coursePrice: {
    findMany: (args: {
      where: { id: { in: string[] }; storeId: string }
    }) => Promise<ReservationCourseRecord[]>
  }
}

export type CourseSelectionUpdate = {
  existingItems: ReservationCourseItem[]
  existingIds: string[]
  requestedIds: string[] | null
  selectionChanged: boolean
  primaryChanged: boolean
}

export function normalizeRequestedCourseIds(
  primaryCourseId: unknown,
  requestedCourseIds: unknown
): string[] {
  const primary = typeof primaryCourseId === 'string' ? primaryCourseId.trim() : ''
  const fromList = Array.isArray(requestedCourseIds)
    ? requestedCourseIds
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean)
    : []
  const courseIds = fromList.length > 0 ? fromList : primary ? [primary] : []

  if (courseIds.length > MAX_RESERVATION_COURSES) {
    throw new Error(`コースは${MAX_RESERVATION_COURSES}件まで選択できます`)
  }
  if (courseIds.length === 0) {
    throw new Error('コースを選択してください')
  }
  if (primary && courseIds[0] !== primary) {
    throw new Error('先頭のコースとメインコースが一致していません')
  }
  return courseIds
}

export function resolveCourseSelectionSummary(
  courseIds: readonly string[],
  catalog: readonly ReservationCourseRecord[]
) {
  const byId = new Map(catalog.map((course) => [course.id, course]))
  const items = courseIds.map((courseId, sortOrder) => {
    const course = byId.get(courseId)
    if (!course) {
      throw new Error('指定されたコースが存在しません。')
    }
    return { ...course, sortOrder }
  })

  return {
    duration: items.reduce((sum, course) => sum + Math.max(0, course.duration), 0),
    price: items.reduce((sum, course) => sum + Math.max(0, course.price), 0),
    storeShare: items.some((course) => course.storeShare != null)
      ? items.reduce((sum, course) => sum + Math.max(0, course.storeShare ?? 0), 0)
      : null,
    castShare: items.some((course) => course.castShare != null)
      ? items.reduce((sum, course) => sum + Math.max(0, course.castShare ?? 0), 0)
      : null,
    items,
  }
}

export function parseReservationCourseItems(value: unknown): ReservationCourseItem[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item, index) => ({
      id: typeof item.id === 'string' ? item.id : '',
      name: typeof item.name === 'string' ? item.name : '',
      duration: Number.isFinite(Number(item.duration)) ? Math.max(0, Number(item.duration)) : 0,
      price: Number.isFinite(Number(item.price)) ? Math.max(0, Number(item.price)) : 0,
      storeShare: Number.isFinite(Number(item.storeShare)) ? Number(item.storeShare) : null,
      castShare: Number.isFinite(Number(item.castShare)) ? Number(item.castShare) : null,
      sortOrder: Number.isInteger(Number(item.sortOrder)) ? Number(item.sortOrder) : index,
    }))
    .filter((item) => item.id && item.name)
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .slice(0, MAX_RESERVATION_COURSES)
}

export async function loadCourseSelectionSummary(
  client: CourseCatalogClient,
  storeId: string,
  courseIds: readonly string[],
  seededCourses: readonly ReservationCourseRecord[] = []
) {
  const seededIds = new Set(seededCourses.map((course) => course.id))
  const missingIds = Array.from(new Set(courseIds.filter((courseId) => !seededIds.has(courseId))))
  const loadedCourses = missingIds.length
    ? await client.coursePrice.findMany({ where: { id: { in: missingIds }, storeId } })
    : []
  return resolveCourseSelectionSummary(courseIds, [...seededCourses, ...loadedCourses])
}

export async function resolveCreateCourseSelection(
  client: CourseCatalogClient,
  storeId: string,
  primaryCourse: ReservationCourseRecord,
  requestedCourseIds: unknown
) {
  const courseIds = normalizeRequestedCourseIds(primaryCourse.id, requestedCourseIds)
  const summary = await loadCourseSelectionSummary(client, storeId, courseIds, [primaryCourse])
  return { courseIds, summary }
}

export async function tryResolveCreateCourseSelection(
  client: CourseCatalogClient,
  storeId: string,
  primaryCourse: ReservationCourseRecord,
  requestedCourseIds: unknown
) {
  try {
    return {
      ok: true as const,
      value: await resolveCreateCourseSelection(client, storeId, primaryCourse, requestedCourseIds),
    }
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error
          ? error.message
          : '指定されたコースが存在しません。コースを管理画面で登録してください。',
    }
  }
}

export function resolveCourseSelectionUpdate(input: {
  currentCourseId: string
  currentCourseItems: unknown
  requestedCourseId: unknown
  requestedCourseIds: unknown
  hasRequestedCourseIds: boolean
}): CourseSelectionUpdate {
  const existingItems = parseReservationCourseItems(input.currentCourseItems)
  const existingIds =
    existingItems.length > 0 ? existingItems.map((course) => course.id) : [input.currentCourseId]
  const requestedIds = input.hasRequestedCourseIds
    ? normalizeRequestedCourseIds(
        input.requestedCourseId ?? input.currentCourseId,
        input.requestedCourseIds
      )
    : null
  const selectionChanged =
    requestedIds !== null &&
    (requestedIds.length !== existingIds.length ||
      requestedIds.some((courseId, index) => courseId !== existingIds[index]))
  const nextPrimaryId = requestedIds?.[0] ?? input.requestedCourseId
  return {
    existingItems,
    existingIds,
    requestedIds,
    selectionChanged,
    primaryChanged: typeof nextPrimaryId === 'string' && nextPrimaryId !== input.currentCourseId,
  }
}

export function tryResolveCourseSelectionUpdate(
  input: Parameters<typeof resolveCourseSelectionUpdate>[0]
) {
  try {
    return { ok: true as const, value: resolveCourseSelectionUpdate(input) }
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : 'コースを選択してください。',
    }
  }
}

export async function resolveCourseSelectionPersistence(
  client: CourseCatalogClient,
  storeId: string,
  update: CourseSelectionUpdate,
  requestedCourseId: unknown
) {
  if (update.selectionChanged && update.requestedIds) {
    const summary = await loadCourseSelectionSummary(client, storeId, update.requestedIds)
    return {
      data: { courseId: update.requestedIds[0], courseItems: summary.items },
      effectiveCourse: summary.items[0],
      summary,
    }
  }
  if (update.primaryChanged) {
    return {
      data: { courseId: requestedCourseId },
      effectiveCourse: null,
      summary: null,
    }
  }
  const summary =
    update.existingItems.length > 0
      ? resolveCourseSelectionSummary(update.existingIds, update.existingItems)
      : null
  return { data: {}, effectiveCourse: null, summary }
}

export function resolveCourseRevenueSource(
  summary: ReturnType<typeof resolveCourseSelectionSummary> | null,
  effectiveCourse: Partial<ReservationCourseRecord> | null | undefined,
  previousCourse: Partial<ReservationCourseRecord> | null | undefined,
  fallbackPrice: unknown
) {
  return {
    price:
      summary?.price ??
      Number(effectiveCourse?.price ?? previousCourse?.price ?? fallbackPrice ?? 0),
    storeShare:
      summary?.storeShare ?? effectiveCourse?.storeShare ?? previousCourse?.storeShare ?? null,
    castShare:
      summary?.castShare ?? effectiveCourse?.castShare ?? previousCourse?.castShare ?? null,
  }
}

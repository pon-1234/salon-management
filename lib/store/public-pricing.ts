/**
 * @design_doc   Production storefront pricing must come from the selected store's persisted data
 * @related_to   Store booking and pricing pages consume this server-only projection
 * @known_issues Additional-fee persistence requires an approved store-scoped target model
 */
import { db } from '@/lib/db'
import { shouldUseMockFallbacks } from '@/lib/config/feature-flags'
import {
  defaultCourses,
  defaultOptions,
  defaultPricingNotes,
  defaultAdditionalFees,
} from '@/lib/pricing/data'
import { ensureCourseSerializable, ensureOptionSerializable } from '@/lib/pricing/adapters'
import type { CoursePrice, OptionPrice, AdditionalFee, StorePricing } from '@/lib/pricing/types'

export async function getPublicStorePricing(storeId: string): Promise<StorePricing> {
  const useMockFallbacks = shouldUseMockFallbacks()
  try {
    const [courses, options] = await Promise.all([
      db.coursePrice.findMany({
        where: { storeId, isActive: true, archivedAt: null },
        orderBy: [{ duration: 'asc' }, { price: 'asc' }],
      }),
      db.optionPrice.findMany({
        where: { storeId, isActive: true, archivedAt: null, visibility: 'public' },
        orderBy: [{ category: 'asc' }, { displayOrder: 'asc' }],
      }),
    ])

    const normalizedCourses =
      courses.length > 0
        ? courses.map(ensureCourseSerializable)
        : useMockFallbacks
          ? defaultCourses
          : []

    const normalizedOptions =
      options.length > 0
        ? options.map(ensureOptionSerializable)
        : useMockFallbacks
          ? defaultOptions
          : []

    return {
      storeId,
      courses: normalizedCourses,
      options: normalizedOptions,
      additionalFees: useMockFallbacks ? (defaultAdditionalFees as AdditionalFee[]) : [],
      notes: useMockFallbacks ? defaultPricingNotes : [],
      lastUpdated: new Date(),
    }
  } catch (error) {
    if (!useMockFallbacks) {
      throw error
    }
    console.error('Failed to load public store pricing, falling back to defaults:', error)
    return {
      storeId,
      courses: defaultCourses,
      options: defaultOptions,
      additionalFees: defaultAdditionalFees as AdditionalFee[],
      notes: defaultPricingNotes,
      lastUpdated: new Date(),
    }
  }
}

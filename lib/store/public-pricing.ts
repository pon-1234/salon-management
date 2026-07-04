import { db } from '@/lib/db'
import {
  defaultCourses,
  defaultOptions,
  defaultPricingNotes,
  defaultAdditionalFees,
} from '@/lib/pricing/data'
import { ensureCourseSerializable, ensureOptionSerializable } from '@/lib/pricing/adapters'
import type { CoursePrice, OptionPrice, AdditionalFee, StorePricing } from '@/lib/pricing/types'

export async function getPublicStorePricing(storeId: string): Promise<StorePricing> {
  try {
    const [courses, options] = await Promise.all([
      db.coursePrice.findMany({
        where: { storeId, isActive: true },
        orderBy: [{ duration: 'asc' }, { price: 'asc' }],
      }),
      db.optionPrice.findMany({
        where: { storeId, isActive: true, visibility: 'public' },
        orderBy: [{ category: 'asc' }, { displayOrder: 'asc' }],
      }),
    ])

    const normalizedCourses =
      courses.length > 0 ? courses.map(ensureCourseSerializable) : defaultCourses

    const normalizedOptions =
      options.length > 0 ? options.map(ensureOptionSerializable) : defaultOptions

    return {
      storeId,
      courses: normalizedCourses,
      options: normalizedOptions,
      additionalFees: defaultAdditionalFees as AdditionalFee[],
      notes: defaultPricingNotes,
      lastUpdated: new Date(),
    }
  } catch (error) {
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

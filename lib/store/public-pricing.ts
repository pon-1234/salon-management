import { db } from '@/lib/db'
import {
  defaultCourses,
  defaultOptions,
  defaultPricingNotes,
  defaultAdditionalFees,
} from '@/lib/pricing/data'
import type { CoursePrice, OptionPrice, AdditionalFee, StorePricing } from '@/lib/pricing/types'

function ensureCourseSerializable(course: any): CoursePrice {
  return {
    id: course.id,
    name: course.name,
    description: course.description ?? null,
    duration: course.duration,
    price: course.price,
    storeShare: course.storeShare ?? null,
    castShare: course.castShare ?? null,
    isActive: course.isActive,
    enableWebBooking: course.enableWebBooking ?? true,
    archivedAt: course.archivedAt ?? null,
    createdAt: course.createdAt ? new Date(course.createdAt) : new Date(),
    updatedAt: course.updatedAt ? new Date(course.updatedAt) : new Date(),
  }
}

function ensureOptionSerializable(option: any): OptionPrice {
  const normalized: any = {
    id: option.id,
    name: option.name,
    description: option.description ?? null,
    price: option.price,
    duration: option.duration ?? null,
    category: option.category ?? 'special',
    displayOrder: option.displayOrder ?? 0,
    isActive: option.isActive,
    isPopular: option.isPopular ?? false,
    storeShare: option.storeShare ?? null,
    castShare: option.castShare ?? null,
    archivedAt: option.archivedAt ?? null,
    createdAt: option.createdAt ? new Date(option.createdAt) : new Date(),
    updatedAt: option.updatedAt ? new Date(option.updatedAt) : new Date(),
  }

  if (option.note !== undefined) {
    normalized.note = option.note
  }

  return normalized as OptionPrice
}

export async function getPublicStorePricing(storeId: string): Promise<StorePricing> {
  try {
    const [courses, options] = await Promise.all([
      db.coursePrice.findMany({
        where: { storeId, isActive: true },
        orderBy: [{ duration: 'asc' }, { price: 'asc' }],
      }),
      db.optionPrice.findMany({
        where: { storeId, isActive: true },
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

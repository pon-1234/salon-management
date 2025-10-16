import { CoursePrice, OptionPrice } from './types'
import { Course, Option } from '../types/course-option'

/**
 * Converts CoursePrice objects from the centralized pricing system
 * to the legacy Course format used in reservations
 */
export function convertCoursePriceToCourse(coursePrice: CoursePrice): Course {
  return {
    id: coursePrice.id,
    name: coursePrice.name,
    duration: coursePrice.duration,
    price: coursePrice.price,
  }
}

/**
 * Converts all active courses from the pricing system to legacy format
 */
export function convertAllCoursePricesToCourses(coursePrices: CoursePrice[]): Course[] {
  return coursePrices.map(convertCoursePriceToCourse)
}

/**
 * Converts OptionPrice objects from the centralized pricing system
 * to the legacy Option format used in reservations
 */
export function convertOptionPriceToOption(optionPrice: OptionPrice): Option {
  return {
    id: optionPrice.id,
    name: optionPrice.name,
    price: optionPrice.price,
    description: optionPrice.description,
    duration: optionPrice.duration,
    category: optionPrice.category,
    storeShare: optionPrice.storeShare ?? null,
    castShare: optionPrice.castShare ?? null,
    isActive: optionPrice.isActive,
    isPopular: optionPrice.isPopular,
    note: optionPrice.note,
  }
}

/**
 * Converts all active options from the pricing system to legacy format
 */
export function convertAllOptionPricesToOptions(optionPrices: OptionPrice[]): Option[] {
  return optionPrices
    .filter((op) => op.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(convertOptionPriceToOption)
}

/**
 * Gets a specific course duration from the pricing system
 */
export function getCourseDurationById(
  courseId: string,
  duration: number,
  coursePrices: CoursePrice[]
): Course | undefined {
  const match = coursePrices.find((course) => course.id === courseId && course.duration === duration)
  return match ? convertCoursePriceToCourse(match) : undefined
}

export function createLegacyCourseId(coursePriceId: string, duration: number): string {
  return `${coursePriceId}-${duration}`
}

export function parseLegacyCourseId(
  legacyId: string
): { coursePriceId: string; duration: number } | null {
  const match = legacyId.match(/^(.+)-(\d+)$/)
  if (!match) {
    return null
  }

  return {
    coursePriceId: match[1],
    duration: parseInt(match[2], 10),
  }
}

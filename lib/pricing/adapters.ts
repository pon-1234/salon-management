import { CoursePrice, OptionPrice } from './types';
import { Course, Option } from '../types/course-option';

/**
 * Converts CoursePrice objects from the centralized pricing system
 * to the legacy Course format used in reservations
 */
export function convertCoursePriceToCourse(coursePrice: CoursePrice): Course[] {
  // Convert each duration into a separate Course object for backward compatibility
  return coursePrice.durations.map((duration, index) => {
    const baseName = coursePrice.name;
    const durationSuffix = duration.time >= 60 ? `${duration.time / 60}時間` : `${duration.time}分`;
    
    return {
      id: `${coursePrice.id}-${duration.time}min`,
      name: `${baseName} ${duration.time}分`,
      duration: duration.time,
      price: duration.price,
    };
  });
}

/**
 * Converts all active courses from the pricing system to legacy format
 */
export function convertAllCoursePricesToCourses(coursePrices: CoursePrice[]): Course[] {
  const courses: Course[] = [];
  
  coursePrices
    .filter(cp => cp.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .forEach(coursePrice => {
      courses.push(...convertCoursePriceToCourse(coursePrice));
    });
  
  return courses;
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
    note: optionPrice.note,
  };
}

/**
 * Converts all active options from the pricing system to legacy format
 */
export function convertAllOptionPricesToOptions(optionPrices: OptionPrice[]): Option[] {
  return optionPrices
    .filter(op => op.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(convertOptionPriceToOption);
}

/**
 * Gets a specific course duration from the pricing system
 */
export function getCourseDurationById(courseId: string, duration: number, coursePrices: CoursePrice[]): Course | undefined {
  for (const coursePrice of coursePrices) {
    const matchingDuration = coursePrice.durations.find(d => d.time === duration);
    if (matchingDuration) {
      const courses = convertCoursePriceToCourse(coursePrice);
      return courses.find(c => c.duration === duration);
    }
  }
  return undefined;
}

/**
 * Creates a legacy course ID from coursePrice ID and duration
 */
export function createLegacyCourseId(coursePriceId: string, duration: number): string {
  return `${coursePriceId}-${duration}min`;
}

/**
 * Parses a legacy course ID to get coursePrice ID and duration
 */
export function parseLegacyCourseId(legacyId: string): { coursePriceId: string; duration: number } | null {
  const match = legacyId.match(/^(.+)-(\d+)min$/);
  if (!match) {
    return null;
  }
  
  return {
    coursePriceId: match[1],
    duration: parseInt(match[2], 10),
  };
}
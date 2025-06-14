import { Course, Option } from '../types/course-option';
import { courses, options, getCourses, getOptions } from './data';

/**
 * Get a course by ID from the static array (for backward compatibility)
 * Note: This uses the cached/fallback data and may not be up-to-date
 */
export function getCourseById(id: string): Course | undefined {
  return courses.find(course => course.id === id);
}

/**
 * Get a course by ID from the pricing system (async, always up-to-date)
 */
export async function getCourseByIdAsync(id: string): Promise<Course | undefined> {
  const allCourses = await getCourses();
  return allCourses.find(course => course.id === id);
}

/**
 * Get an option by ID from the static array (for backward compatibility)
 * Note: This uses the cached/fallback data and may not be up-to-date
 */
export function getOptionById(id: string): Option | undefined {
  return options.find(option => option.id === id);
}

/**
 * Get an option by ID from the pricing system (async, always up-to-date)
 */
export async function getOptionByIdAsync(id: string): Promise<Option | undefined> {
  const allOptions = await getOptions();
  return allOptions.find(option => option.id === id);
}

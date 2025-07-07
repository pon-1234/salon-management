import { Course, Option } from '../types/course-option'
import { getPricingUseCases } from '../pricing'
import {
  convertAllCoursePricesToCourses,
  convertAllOptionPricesToOptions,
} from '../pricing/adapters'

// Cache for courses and options to avoid fetching on every import
let cachedCourses: Course[] | null = null
let cachedOptions: Option[] | null = null
let lastFetchTime: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Get courses from the centralized pricing system
 * Uses caching to avoid excessive API calls
 */
export async function getCourses(): Promise<Course[]> {
  const now = Date.now()

  // Return cached data if it's still fresh
  if (cachedCourses && now - lastFetchTime < CACHE_DURATION) {
    return cachedCourses
  }

  try {
    const pricingUseCases = getPricingUseCases()
    const coursePrices = await pricingUseCases.getCourses()
    cachedCourses = convertAllCoursePricesToCourses(coursePrices)
    lastFetchTime = now
    return cachedCourses
  } catch (error) {
    console.error('Failed to fetch courses from pricing system:', error)
    // Return fallback data if pricing system fails
    return getFallbackCourses()
  }
}

/**
 * Get options from the centralized pricing system
 * Uses caching to avoid excessive API calls
 */
export async function getOptions(): Promise<Option[]> {
  const now = Date.now()

  // Return cached data if it's still fresh
  if (cachedOptions && now - lastFetchTime < CACHE_DURATION) {
    return cachedOptions
  }

  try {
    const pricingUseCases = getPricingUseCases()
    const optionPrices = await pricingUseCases.getOptions()
    cachedOptions = convertAllOptionPricesToOptions(optionPrices)
    lastFetchTime = now
    return cachedOptions
  } catch (error) {
    console.error('Failed to fetch options from pricing system:', error)
    // Return fallback data if pricing system fails
    return getFallbackOptions()
  }
}

/**
 * Clear the cache to force a refresh
 */
export function clearPricingCache(): void {
  cachedCourses = null
  cachedOptions = null
  lastFetchTime = 0
}

/**
 * Legacy exports for backward compatibility
 * These will be populated on first access
 */
export let courses: Course[] = []
export let options: Option[] = []

// Initialize with fallback data for immediate availability
courses = getFallbackCourses()
options = getFallbackOptions()

// Asynchronously update with real data
;(async () => {
  courses = await getCourses()
  options = await getOptions()
})()

/**
 * Fallback data in case the pricing system is unavailable
 */
function getFallbackCourses(): Course[] {
  return [
    { id: '1-60min', name: 'スタンダードコース 60分', duration: 60, price: 12000 },
    { id: '1-90min', name: 'スタンダードコース 90分', duration: 90, price: 18000 },
    { id: '1-120min', name: 'スタンダードコース 120分', duration: 120, price: 24000 },
    { id: '2-90min', name: 'プレミアムコース 90分', duration: 90, price: 25000 },
    { id: '2-120min', name: 'プレミアムコース 120分', duration: 120, price: 32000 },
    { id: '2-150min', name: 'プレミアムコース 150分', duration: 150, price: 40000 },
    { id: '3-120min', name: 'VIPコース 120分', duration: 120, price: 45000 },
    { id: '3-150min', name: 'VIPコース 150分', duration: 150, price: 55000 },
    { id: '3-180min', name: 'VIPコース 180分', duration: 180, price: 65000 },
    { id: 'extension30', name: '延長30分', duration: 30, price: 8000 },
  ]
}

function getFallbackOptions(): Option[] {
  return [
    { id: '1', name: 'オールヌード', price: 3000 },
    { id: '2', name: 'ローション追加', price: 2000 },
    { id: '3', name: 'コスプレ', price: 2000 },
    { id: '4', name: '延長30分', price: 8000 },
    { id: '5', name: 'ホットストーン', price: 2000 },
    { id: '6', name: 'アロマトリートメント', price: 1500 },
    { id: '7', name: 'ネックトリートメント', price: 1000 },
  ]
}

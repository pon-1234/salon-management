import { useState, useEffect } from 'react'
import { CoursePrice, OptionPrice, AdditionalFee } from '@/lib/pricing/types'
import { Course, Option } from '@/lib/types/course-option'
import { getPricingUseCases } from '@/lib/pricing'
import {
  convertAllCoursePricesToCourses,
  convertAllOptionPricesToOptions,
} from '@/lib/pricing/adapters'

interface UsePricingResult {
  // Raw pricing data
  coursePrices: CoursePrice[]
  optionPrices: OptionPrice[]
  additionalFees: AdditionalFee[]

  // Legacy format for backward compatibility
  courses: Course[]
  options: Option[]

  // Loading states
  loading: boolean
  error: Error | null

  // Refresh function
  refresh: () => Promise<void>
}

/**
 * Hook to fetch and use pricing data from the centralized pricing system
 * Provides both raw pricing data and legacy format for backward compatibility
 */
export function usePricing(storeId?: string): UsePricingResult {
  const [coursePrices, setCoursePrices] = useState<CoursePrice[]>([])
  const [optionPrices, setOptionPrices] = useState<OptionPrice[]>([])
  const [additionalFees, setAdditionalFees] = useState<AdditionalFee[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [options, setOptions] = useState<Option[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchPricing = async () => {
    try {
      setLoading(true)
      setError(null)

      const pricingUseCases = getPricingUseCases()

      // Fetch all pricing data in parallel
      const [fetchedCourses, fetchedOptions, fetchedFees] = await Promise.all([
        pricingUseCases.getCourses(storeId),
        pricingUseCases.getOptions(storeId),
        pricingUseCases.getAdditionalFees(storeId),
      ])

      // Update raw pricing data
      setCoursePrices(fetchedCourses)
      setOptionPrices(fetchedOptions)
      setAdditionalFees(fetchedFees)

      // Convert to legacy format
      setCourses(convertAllCoursePricesToCourses(fetchedCourses))
      setOptions(convertAllOptionPricesToOptions(fetchedOptions))
    } catch (err) {
      setError(err as Error)
      console.error('Failed to fetch pricing data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPricing()
  }, [storeId])

  return {
    coursePrices,
    optionPrices,
    additionalFees,
    courses,
    options,
    loading,
    error,
    refresh: fetchPricing,
  }
}

/**
 * Hook to calculate total price based on selections
 */
export function usePriceCalculation() {
  const pricingUseCases = getPricingUseCases()

  const calculateTotal = async (
    courseId: string,
    duration: number,
    optionIds: string[],
    isLateNight: boolean = false
  ): Promise<number> => {
    try {
      return await pricingUseCases.calculateTotalPrice(courseId, duration, optionIds, isLateNight)
    } catch (error) {
      console.error('Failed to calculate price:', error)
      return 0
    }
  }

  return { calculateTotal }
}

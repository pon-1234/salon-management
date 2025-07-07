import { Repository } from '../shared'
import { CoursePrice, OptionPrice, AdditionalFee, StorePricing, PricingSyncStatus } from './types'

export interface PricingRepository {
  // Course pricing methods
  getCourses(storeId?: string): Promise<CoursePrice[]>
  getCourseById(id: string): Promise<CoursePrice | null>
  createCourse(course: Omit<CoursePrice, 'id' | 'createdAt' | 'updatedAt'>): Promise<CoursePrice>
  updateCourse(id: string, course: Partial<CoursePrice>): Promise<CoursePrice>
  deleteCourse(id: string): Promise<void>

  // Option pricing methods
  getOptions(storeId?: string): Promise<OptionPrice[]>
  getOptionById(id: string): Promise<OptionPrice | null>
  createOption(option: Omit<OptionPrice, 'id' | 'createdAt' | 'updatedAt'>): Promise<OptionPrice>
  updateOption(id: string, option: Partial<OptionPrice>): Promise<OptionPrice>
  deleteOption(id: string): Promise<void>

  // Additional fees methods
  getAdditionalFees(storeId?: string): Promise<AdditionalFee[]>
  getAdditionalFeeById(id: string): Promise<AdditionalFee | null>
  createAdditionalFee(
    fee: Omit<AdditionalFee, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<AdditionalFee>
  updateAdditionalFee(id: string, fee: Partial<AdditionalFee>): Promise<AdditionalFee>
  deleteAdditionalFee(id: string): Promise<void>

  // Store-specific pricing methods
  getStorePricing(storeId: string): Promise<StorePricing>
  updateStorePricing(storeId: string, pricing: Partial<StorePricing>): Promise<StorePricing>

  // Sync methods
  getSyncStatus(storeId: string): Promise<PricingSyncStatus>
  syncPricing(storeId: string): Promise<void>
}

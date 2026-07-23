/**
 * @design_doc   Multi-store pricing repository contract
 * @related_to   PricingRepositoryImpl and PricingUseCases
 * @known_issues In-memory additional-fee storage is not yet persisted
 */
import { Repository } from '../shared'
import { CoursePrice, OptionPrice, AdditionalFee, StorePricing, PricingSyncStatus } from './types'

export interface PricingRepository {
  // Course pricing methods
  getCourses(storeId?: string): Promise<CoursePrice[]>
  getCourseById(id: string, storeId?: string): Promise<CoursePrice | null>
  createCourse(
    course: Omit<CoursePrice, 'id' | 'createdAt' | 'updatedAt'>,
    storeId: string
  ): Promise<CoursePrice>
  updateCourse(id: string, course: Partial<CoursePrice>, storeId: string): Promise<CoursePrice>
  deleteCourse(id: string, storeId: string): Promise<void>

  // Option pricing methods
  getOptions(storeId?: string): Promise<OptionPrice[]>
  getOptionById(id: string, storeId?: string): Promise<OptionPrice | null>
  createOption(
    option: Omit<OptionPrice, 'id' | 'createdAt' | 'updatedAt'>,
    storeId: string
  ): Promise<OptionPrice>
  updateOption(id: string, option: Partial<OptionPrice>, storeId: string): Promise<OptionPrice>
  deleteOption(id: string, storeId: string): Promise<void>

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

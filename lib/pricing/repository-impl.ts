import { PricingRepository } from './repository'
import { CoursePrice, OptionPrice, AdditionalFee, StorePricing, PricingSyncStatus } from './types'
import { defaultCourses, defaultOptions, defaultAdditionalFees, defaultPricingNotes } from './data'

export class PricingRepositoryImpl implements PricingRepository {
  private courses: Map<string, CoursePrice> = new Map()
  private options: Map<string, OptionPrice> = new Map()
  private additionalFees: Map<string, AdditionalFee> = new Map()
  private storePricing: Map<string, StorePricing> = new Map()
  private syncStatus: Map<string, PricingSyncStatus> = new Map()

  constructor() {
    // Initialize with default data
    defaultCourses.forEach((course) => this.courses.set(course.id, course))
    defaultOptions.forEach((option) => this.options.set(option.id, option))
    defaultAdditionalFees.forEach((fee) => this.additionalFees.set(fee.id, fee))
  }

  // Course pricing methods
  async getCourses(storeId?: string): Promise<CoursePrice[]> {
    const allCourses = Array.from(this.courses.values())
    return allCourses
      .filter((course) => course.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder)
  }

  async getCourseById(id: string): Promise<CoursePrice | null> {
    return this.courses.get(id) || null
  }

  async createCourse(
    course: Omit<CoursePrice, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<CoursePrice> {
    const newCourse: CoursePrice = {
      ...course,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.courses.set(newCourse.id, newCourse)
    return newCourse
  }

  async updateCourse(id: string, course: Partial<CoursePrice>): Promise<CoursePrice> {
    const existing = await this.getCourseById(id)
    if (!existing) {
      throw new Error(`Course with id ${id} not found`)
    }
    const updated = {
      ...existing,
      ...course,
      id,
      updatedAt: new Date(),
    }
    this.courses.set(id, updated)
    return updated
  }

  async deleteCourse(id: string): Promise<void> {
    this.courses.delete(id)
  }

  // Option pricing methods
  async getOptions(storeId?: string): Promise<OptionPrice[]> {
    const allOptions = Array.from(this.options.values())
    return allOptions
      .filter((option) => option.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder)
  }

  async getOptionById(id: string): Promise<OptionPrice | null> {
    return this.options.get(id) || null
  }

  async createOption(
    option: Omit<OptionPrice, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<OptionPrice> {
    const newOption: OptionPrice = {
      ...option,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.options.set(newOption.id, newOption)
    return newOption
  }

  async updateOption(id: string, option: Partial<OptionPrice>): Promise<OptionPrice> {
    const existing = await this.getOptionById(id)
    if (!existing) {
      throw new Error(`Option with id ${id} not found`)
    }
    const updated = {
      ...existing,
      ...option,
      id,
      updatedAt: new Date(),
    }
    this.options.set(id, updated)
    return updated
  }

  async deleteOption(id: string): Promise<void> {
    this.options.delete(id)
  }

  // Additional fees methods
  async getAdditionalFees(storeId?: string): Promise<AdditionalFee[]> {
    const allFees = Array.from(this.additionalFees.values())
    return allFees.filter((fee) => fee.isActive).sort((a, b) => a.displayOrder - b.displayOrder)
  }

  async getAdditionalFeeById(id: string): Promise<AdditionalFee | null> {
    return this.additionalFees.get(id) || null
  }

  async createAdditionalFee(
    fee: Omit<AdditionalFee, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<AdditionalFee> {
    const newFee: AdditionalFee = {
      ...fee,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.additionalFees.set(newFee.id, newFee)
    return newFee
  }

  async updateAdditionalFee(id: string, fee: Partial<AdditionalFee>): Promise<AdditionalFee> {
    const existing = await this.getAdditionalFeeById(id)
    if (!existing) {
      throw new Error(`Additional fee with id ${id} not found`)
    }
    const updated = {
      ...existing,
      ...fee,
      id,
      updatedAt: new Date(),
    }
    this.additionalFees.set(id, updated)
    return updated
  }

  async deleteAdditionalFee(id: string): Promise<void> {
    this.additionalFees.delete(id)
  }

  // Store-specific pricing methods
  async getStorePricing(storeId: string): Promise<StorePricing> {
    const existing = this.storePricing.get(storeId)
    if (existing) {
      return existing
    }

    // Return default pricing for new stores
    const storePricing: StorePricing = {
      storeId,
      courses: await this.getCourses(storeId),
      options: await this.getOptions(storeId),
      additionalFees: await this.getAdditionalFees(storeId),
      notes: defaultPricingNotes,
      lastUpdated: new Date(),
    }
    this.storePricing.set(storeId, storePricing)
    return storePricing
  }

  async updateStorePricing(storeId: string, pricing: Partial<StorePricing>): Promise<StorePricing> {
    const existing = await this.getStorePricing(storeId)
    const updated: StorePricing = {
      ...existing,
      ...pricing,
      storeId,
      lastUpdated: new Date(),
    }
    this.storePricing.set(storeId, updated)

    // Mark as unsynced
    await this.updateSyncStatus(storeId, false)

    return updated
  }

  // Sync methods
  async getSyncStatus(storeId: string): Promise<PricingSyncStatus> {
    const existing = this.syncStatus.get(storeId)
    if (existing) {
      return existing
    }

    const status: PricingSyncStatus = {
      storeId,
      lastSyncedAt: new Date(),
      isSynced: true,
      pendingChanges: 0,
    }
    this.syncStatus.set(storeId, status)
    return status
  }

  async syncPricing(storeId: string): Promise<void> {
    // In a real implementation, this would sync with a backend
    // For now, we'll just mark it as synced
    await this.updateSyncStatus(storeId, true)
  }

  private async updateSyncStatus(storeId: string, isSynced: boolean): Promise<void> {
    const status: PricingSyncStatus = {
      storeId,
      lastSyncedAt: isSynced
        ? new Date()
        : this.syncStatus.get(storeId)?.lastSyncedAt || new Date(),
      isSynced,
      pendingChanges: isSynced ? 0 : (this.syncStatus.get(storeId)?.pendingChanges || 0) + 1,
    }
    this.syncStatus.set(storeId, status)
  }
}

// Singleton instance
let repository: PricingRepository | null = null

export function getPricingRepository(): PricingRepository {
  if (!repository) {
    repository = new PricingRepositoryImpl()
  }
  return repository
}

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
    const response = await fetch('/api/course')
    if (!response.ok) {
      throw new Error(`Failed to fetch courses: ${response.statusText}`)
    }
    const courses = await response.json()
    return courses
      .filter((course: any) => course.isActive !== false)
      .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0))
  }

  async getCourseById(id: string): Promise<CoursePrice | null> {
    const response = await fetch(`/api/course?id=${id}`)
    if (response.status === 404) {
      return null
    }
    if (!response.ok) {
      throw new Error(`Failed to fetch course: ${response.statusText}`)
    }
    return response.json()
  }

  async createCourse(
    course: Omit<CoursePrice, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<CoursePrice> {
    const response = await fetch('/api/course', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(course),
    })
    if (!response.ok) {
      throw new Error(`Failed to create course: ${response.statusText}`)
    }
    return response.json()
  }

  async updateCourse(id: string, course: Partial<CoursePrice>): Promise<CoursePrice> {
    const response = await fetch('/api/course', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, ...course }),
    })
    if (!response.ok) {
      throw new Error(`Failed to update course: ${response.statusText}`)
    }
    return response.json()
  }

  async deleteCourse(id: string): Promise<void> {
    const response = await fetch(`/api/course?id=${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error(`Failed to delete course: ${response.statusText}`)
    }
  }

  // Option pricing methods
  async getOptions(storeId?: string): Promise<OptionPrice[]> {
    const response = await fetch('/api/option')
    if (!response.ok) {
      throw new Error(`Failed to fetch options: ${response.statusText}`)
    }
    const options = await response.json()
    return options
      .filter((option: any) => option.isActive !== false)
      .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0))
  }

  async getOptionById(id: string): Promise<OptionPrice | null> {
    const response = await fetch(`/api/option?id=${id}`)
    if (response.status === 404) {
      return null
    }
    if (!response.ok) {
      throw new Error(`Failed to fetch option: ${response.statusText}`)
    }
    return response.json()
  }

  async createOption(
    option: Omit<OptionPrice, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<OptionPrice> {
    const response = await fetch('/api/option', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(option),
    })
    if (!response.ok) {
      throw new Error(`Failed to create option: ${response.statusText}`)
    }
    return response.json()
  }

  async updateOption(id: string, option: Partial<OptionPrice>): Promise<OptionPrice> {
    const response = await fetch('/api/option', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, ...option }),
    })
    if (!response.ok) {
      throw new Error(`Failed to update option: ${response.statusText}`)
    }
    return response.json()
  }

  async deleteOption(id: string): Promise<void> {
    const response = await fetch(`/api/option?id=${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error(`Failed to delete option: ${response.statusText}`)
    }
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

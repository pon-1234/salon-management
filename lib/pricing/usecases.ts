import { PricingRepository } from './repository'
import { getPricingRepository } from './repository-impl'
import { CoursePrice, OptionPrice, AdditionalFee, StorePricing, PricingSyncStatus } from './types'

export class PricingUseCases {
  constructor(private repository: PricingRepository = getPricingRepository()) {}

  // Course management
  async getCourses(storeId?: string): Promise<CoursePrice[]> {
    return this.repository.getCourses(storeId)
  }

  async getCourseById(id: string): Promise<CoursePrice | null> {
    return this.repository.getCourseById(id)
  }

  async createCourse(
    course: Omit<CoursePrice, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<CoursePrice> {
    return this.repository.createCourse(course)
  }

  async updateCourse(id: string, course: Partial<CoursePrice>): Promise<CoursePrice> {
    return this.repository.updateCourse(id, course)
  }

  async deleteCourse(id: string): Promise<void> {
    return this.repository.deleteCourse(id)
  }

  // Option management
  async getOptions(storeId?: string): Promise<OptionPrice[]> {
    return this.repository.getOptions(storeId)
  }

  async getOptionById(id: string): Promise<OptionPrice | null> {
    return this.repository.getOptionById(id)
  }

  async createOption(
    option: Omit<OptionPrice, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<OptionPrice> {
    return this.repository.createOption(option)
  }

  async updateOption(id: string, option: Partial<OptionPrice>): Promise<OptionPrice> {
    return this.repository.updateOption(id, option)
  }

  async deleteOption(id: string): Promise<void> {
    return this.repository.deleteOption(id)
  }

  async toggleOptionStatus(id: string): Promise<OptionPrice> {
    const option = await this.repository.getOptionById(id)
    if (!option) {
      throw new Error(`Option with id ${id} not found`)
    }
    return this.repository.updateOption(id, { isActive: !option.isActive })
  }

  // Additional fees management
  async getAdditionalFees(storeId?: string): Promise<AdditionalFee[]> {
    return this.repository.getAdditionalFees(storeId)
  }

  async getAdditionalFeeById(id: string): Promise<AdditionalFee | null> {
    return this.repository.getAdditionalFeeById(id)
  }

  async createAdditionalFee(
    fee: Omit<AdditionalFee, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<AdditionalFee> {
    return this.repository.createAdditionalFee(fee)
  }

  async updateAdditionalFee(id: string, fee: Partial<AdditionalFee>): Promise<AdditionalFee> {
    return this.repository.updateAdditionalFee(id, fee)
  }

  async deleteAdditionalFee(id: string): Promise<void> {
    return this.repository.deleteAdditionalFee(id)
  }

  // Store pricing management
  async getStorePricing(storeId: string): Promise<StorePricing> {
    return this.repository.getStorePricing(storeId)
  }

  async updateStorePricing(storeId: string, pricing: Partial<StorePricing>): Promise<StorePricing> {
    return this.repository.updateStorePricing(storeId, pricing)
  }

  async updateStorePricingNotes(storeId: string, notes: string[]): Promise<StorePricing> {
    return this.repository.updateStorePricing(storeId, { notes })
  }

  // Sync management
  async getSyncStatus(storeId: string): Promise<PricingSyncStatus> {
    return this.repository.getSyncStatus(storeId)
  }

  async syncPricing(storeId: string): Promise<void> {
    return this.repository.syncPricing(storeId)
  }

  // Utility methods
  async calculateTotalPrice(
    courseId: string,
    duration: number,
    optionIds: string[],
    isLateNight: boolean = false
  ): Promise<number> {
    let total = 0

    // Get course price
    const course = await this.repository.getCourseById(courseId)
    if (course && (duration === course.duration || !duration)) {
      total += course.price
    }

    // Add option prices
    for (const optionId of optionIds) {
      const option = await this.repository.getOptionById(optionId)
      if (option) {
        total += option.price
      }
    }

    // Apply late night fee if applicable
    if (isLateNight) {
      const fees = await this.repository.getAdditionalFees()
      const lateNightFee = fees.find((fee) => fee.name.includes('深夜料金'))
      if (
        lateNightFee &&
        lateNightFee.type === 'percentage' &&
        typeof lateNightFee.value === 'number'
      ) {
        total = total * (1 + lateNightFee.value / 100)
      }
    }

    return Math.round(total)
  }

  // Migration method to convert from old format
  async migrateFromOldFormat(oldCourses: any[], oldOptions: any[], storeId: string): Promise<void> {
    // Migrate courses
    for (const oldCourse of oldCourses) {
      const durationEntries = Array.isArray(oldCourse.durations) && oldCourse.durations.length > 0
        ? oldCourse.durations
        : [{ time: oldCourse.duration ?? 60, price: oldCourse.price ?? 0, storeShare: oldCourse.storeShare, castShare: oldCourse.castShare }]

      for (const entry of durationEntries) {
        await this.createCourse({
          name:
            durationEntries.length > 1
              ? `${oldCourse.name} ${entry.time}分`
              : oldCourse.name,
          description: oldCourse.description || '',
          duration: entry.time,
          price: entry.price,
          storeShare: entry.storeShare,
          castShare: entry.castShare,
          isActive: oldCourse.isActive ?? true,
        })
      }
    }

    // Migrate options
    for (const oldOption of oldOptions) {
      await this.createOption({
        name: oldOption.name,
        description: oldOption.description,
        price: oldOption.price,
        duration: oldOption.duration,
        category: this.determineOptionCategory(oldOption.name),
        displayOrder: oldOption.displayOrder || 999,
        isActive: oldOption.isActive ?? true,
        note: oldOption.note,
      })
    }
  }
  private determineOptionCategory(
    name: string
  ): 'relaxation' | 'body-care' | 'extension' | 'special' {
    if (name.includes('延長')) return 'extension'
    if (name.includes('ホットストーン') || name.includes('アロマ')) return 'relaxation'
    if (name.includes('ネック') || name.includes('ボディ')) return 'body-care'
    return 'special'
  }
}

// Singleton instance
let useCases: PricingUseCases | null = null

export function getPricingUseCases(): PricingUseCases {
  if (!useCases) {
    useCases = new PricingUseCases()
  }
  return useCases
}

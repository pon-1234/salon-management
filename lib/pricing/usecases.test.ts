import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PricingUseCases } from './usecases'
import { PricingRepository } from './repository'
import type {
  CoursePrice,
  OptionPrice,
  AdditionalFee,
  StorePricing,
  PricingSyncStatus,
} from './types'

describe('PricingUseCases', () => {
  let mockRepository: PricingRepository
  let useCases: PricingUseCases

  beforeEach(() => {
    mockRepository = {
      getCourses: vi.fn(),
      getCourseById: vi.fn(),
      createCourse: vi.fn(),
      updateCourse: vi.fn(),
      deleteCourse: vi.fn(),
      getOptions: vi.fn(),
      getOptionById: vi.fn(),
      createOption: vi.fn(),
      updateOption: vi.fn(),
      deleteOption: vi.fn(),
      getAdditionalFees: vi.fn(),
      getAdditionalFeeById: vi.fn(),
      createAdditionalFee: vi.fn(),
      updateAdditionalFee: vi.fn(),
      deleteAdditionalFee: vi.fn(),
      getStorePricing: vi.fn(),
      updateStorePricing: vi.fn(),
      getSyncStatus: vi.fn(),
      syncPricing: vi.fn(),
    }
    useCases = new PricingUseCases(mockRepository)
  })

  describe('Course management', () => {
    describe('getCourses', () => {
      it('should return courses from repository', async () => {
        const mockCourses: CoursePrice[] = [
          {
            id: 'course-1',
            name: 'Standard Course',
            description: 'Standard course description',
            duration: 60,
          price: 10000,
          storeShare: 6000,
          castShare: 4000,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        ]
        vi.mocked(mockRepository.getCourses).mockResolvedValue(mockCourses)

        const result = await useCases.getCourses('store-1')

        expect(mockRepository.getCourses).toHaveBeenCalledWith('store-1')
        expect(result).toEqual(mockCourses)
      })
    })

    describe('getCourseById', () => {
      it('should return course by id', async () => {
        const mockCourse: CoursePrice = {
          id: 'course-1',
          name: 'Standard Course',
          description: 'Standard course description',
          duration: 60,
          price: 10000,
          storeShare: 6000,
          castShare: 4000,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        vi.mocked(mockRepository.getCourseById).mockResolvedValue(mockCourse)

        const result = await useCases.getCourseById('course-1')

        expect(mockRepository.getCourseById).toHaveBeenCalledWith('course-1')
        expect(result).toEqual(mockCourse)
      })

      it('should return null when course not found', async () => {
        vi.mocked(mockRepository.getCourseById).mockResolvedValue(null)

        const result = await useCases.getCourseById('non-existent')

        expect(result).toBeNull()
      })
    })

  })

  describe('Option management', () => {
    describe('getOptions', () => {
      it('should return options from repository', async () => {
        const mockOptions: OptionPrice[] = [
          {
            id: 'option-1',
            name: 'Option 1',
            description: 'Option description',
            price: 2000,
            duration: 30,
            category: 'relaxation',
            displayOrder: 1,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]
        vi.mocked(mockRepository.getOptions).mockResolvedValue(mockOptions)

        const result = await useCases.getOptions('store-1')

        expect(mockRepository.getOptions).toHaveBeenCalledWith('store-1')
        expect(result).toEqual(mockOptions)
      })
    })

    describe('toggleOptionStatus', () => {
      it('should toggle option status from inactive to active', async () => {
        const mockOption: OptionPrice = {
          id: 'option-1',
          name: 'Option 1',
          description: 'Option description',
          price: 2000,
          duration: 30,
          category: 'relaxation',
          displayOrder: 1,
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        const updatedOption = { ...mockOption, isActive: true }

        vi.mocked(mockRepository.getOptionById).mockResolvedValue(mockOption)
        vi.mocked(mockRepository.updateOption).mockResolvedValue(updatedOption)

        const result = await useCases.toggleOptionStatus('option-1')

        expect(mockRepository.getOptionById).toHaveBeenCalledWith('option-1')
        expect(mockRepository.updateOption).toHaveBeenCalledWith('option-1', { isActive: true })
        expect(result).toEqual(updatedOption)
      })

      it('should throw error when option not found', async () => {
        vi.mocked(mockRepository.getOptionById).mockResolvedValue(null)

        await expect(useCases.toggleOptionStatus('non-existent')).rejects.toThrow(
          'Option with id non-existent not found'
        )
      })
    })
  })

  describe('calculateTotalPrice', () => {
    it('should calculate total price with course and options', async () => {
      const mockCourse: CoursePrice = {
        id: 'course-1',
        name: 'Standard Course',
        description: '',
        duration: 90,
        price: 15000,
        storeShare: 9000,
        castShare: 6000,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockOption1: OptionPrice = {
        id: 'option-1',
        name: 'Option 1',
        description: '',
        price: 2000,
        duration: 0,
        category: 'relaxation',
        displayOrder: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockOption2: OptionPrice = {
        id: 'option-2',
        name: 'Option 2',
        description: '',
        price: 3000,
        duration: 0,
        category: 'body-care',
        displayOrder: 2,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.getCourseById).mockResolvedValue(mockCourse)
      vi.mocked(mockRepository.getOptionById)
        .mockResolvedValueOnce(mockOption1)
        .mockResolvedValueOnce(mockOption2)

      const total = await useCases.calculateTotalPrice(
        'course-1',
        90,
        ['option-1', 'option-2'],
        false
      )

      expect(total).toBe(20000) // 15000 + 2000 + 3000
    })

    it('should apply late night fee when applicable', async () => {
      const mockCourse: CoursePrice = {
        id: 'course-1',
        name: 'Standard Course',
        description: '',
        duration: 60,
        price: 10000,
        storeShare: 6000,
        castShare: 4000,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockFees: AdditionalFee[] = [
        {
          id: 'fee-1',
          name: '深夜料金',
          type: 'percentage',
          value: 20,
          description: '22時以降',
          displayOrder: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(mockRepository.getCourseById).mockResolvedValue(mockCourse)
      vi.mocked(mockRepository.getAdditionalFees).mockResolvedValue(mockFees)

      const total = await useCases.calculateTotalPrice('course-1', 60, [], true)

      expect(total).toBe(12000) // 10000 * 1.2
    })

    it('should return 0 when course not found', async () => {
      vi.mocked(mockRepository.getCourseById).mockResolvedValue(null)

      const total = await useCases.calculateTotalPrice('non-existent', 60, [], false)

      expect(total).toBe(0)
    })
  })

  describe('determineOptionCategory', () => {
    it('should determine extension category', () => {
      const category = (useCases as any).determineOptionCategory('延長30分')
      expect(category).toBe('extension')
    })

    it('should determine relaxation category for hot stone', () => {
      const category = (useCases as any).determineOptionCategory('ホットストーン')
      expect(category).toBe('relaxation')
    })

    it('should determine relaxation category for aroma', () => {
      const category = (useCases as any).determineOptionCategory('アロマトリートメント')
      expect(category).toBe('relaxation')
    })

    it('should determine body-care category for neck treatment', () => {
      const category = (useCases as any).determineOptionCategory('ネックケア')
      expect(category).toBe('body-care')
    })

    it('should determine body-care category for body treatment', () => {
      const category = (useCases as any).determineOptionCategory('ボディケア')
      expect(category).toBe('body-care')
    })

    it('should determine special category for others', () => {
      const category = (useCases as any).determineOptionCategory('特別オプション')
      expect(category).toBe('special')
    })
  })
})

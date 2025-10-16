import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defaultCourses, defaultOptions, defaultAdditionalFees, defaultPricingNotes } from './data'

describe('Pricing Data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('defaultCourses', () => {
    it('should export an array of courses', () => {
      expect(Array.isArray(defaultCourses)).toBe(true)
      expect(defaultCourses.length).toBeGreaterThan(0)
    })

    it('should have valid course structure', () => {
      defaultCourses.forEach((course) => {
        expect(course).toHaveProperty('id')
        expect(course).toHaveProperty('name')
        expect(course).toHaveProperty('description')
        expect(course).toHaveProperty('duration')
        expect(course).toHaveProperty('price')
        expect(course).toHaveProperty('createdAt')
        expect(course).toHaveProperty('updatedAt')

        expect(typeof course.id).toBe('string')
        expect(typeof course.name).toBe('string')
        expect(typeof course.description === 'string' || course.description === null).toBe(true)
        expect(typeof course.duration).toBe('number')
        expect(typeof course.price).toBe('number')
        expect(course.createdAt).toBeInstanceOf(Date)
        expect(course.updatedAt).toBeInstanceOf(Date)
      })
    })

    it('should have unique course IDs', () => {
      const ids = defaultCourses.map((course) => course.id)
      const uniqueIds = [...new Set(ids)]
      expect(ids.length).toBe(uniqueIds.length)
    })
  })

  describe('defaultOptions', () => {
    it('should export an array of options', () => {
      expect(Array.isArray(defaultOptions)).toBe(true)
      expect(defaultOptions.length).toBeGreaterThan(0)
    })

    it('should have valid option structure', () => {
      defaultOptions.forEach((option) => {
        expect(option).toHaveProperty('id')
        expect(option).toHaveProperty('name')
        expect(option).toHaveProperty('description')
        expect(option).toHaveProperty('price')
        expect(option).toHaveProperty('category')
        expect(option).toHaveProperty('displayOrder')
        expect(option).toHaveProperty('isActive')
        expect(option).toHaveProperty('createdAt')
        expect(option).toHaveProperty('updatedAt')

        expect(typeof option.id).toBe('string')
        expect(typeof option.name).toBe('string')
        expect(typeof option.description).toBe('string')
        expect(typeof option.price).toBe('number')
        expect(typeof option.category).toBe('string')
        expect(typeof option.displayOrder).toBe('number')
        expect(typeof option.isActive).toBe('boolean')
        expect(option.createdAt).toBeInstanceOf(Date)
        expect(option.updatedAt).toBeInstanceOf(Date)
      })
    })

    it('should have unique option IDs', () => {
      const ids = defaultOptions.map((option) => option.id)
      const uniqueIds = [...new Set(ids)]
      expect(ids.length).toBe(uniqueIds.length)
    })

    it('should have free and paid options', () => {
      const freeOptions = defaultOptions.filter((o) => o.price === 0)
      const paidOptions = defaultOptions.filter((o) => o.price > 0)

      expect(freeOptions.length).toBeGreaterThan(0)
      expect(paidOptions.length).toBeGreaterThan(0)
    })

    it('should have different option categories', () => {
      const categories = [...new Set(defaultOptions.map((o) => o.category))]
      expect(categories.length).toBeGreaterThan(1)
      expect(categories).toContain('relaxation')
      expect(categories).toContain('special')
    })

    it('should have popular options marked', () => {
      const popularOptions = defaultOptions.filter((o) => o.isPopular)
      expect(popularOptions.length).toBeGreaterThan(0)

      popularOptions.forEach((option) => {
        expect(option.note).toBeDefined()
        expect(option.note).toMatch(/人気No\.\d/)
      })
    })

    it('should have extension option with duration', () => {
      const extensionOptions = defaultOptions.filter((o) => o.category === 'extension')

      extensionOptions.forEach((option) => {
        expect(option.duration).toBeDefined()
        expect(typeof option.duration).toBe('number')
        expect(option.duration).toBeGreaterThan(0)
      })
    })
  })

  describe('defaultAdditionalFees', () => {
    it('should export an array of additional fees', () => {
      expect(Array.isArray(defaultAdditionalFees)).toBe(true)
      expect(defaultAdditionalFees.length).toBeGreaterThan(0)
    })

    it('should have valid additional fee structure', () => {
      defaultAdditionalFees.forEach((fee) => {
        expect(fee).toHaveProperty('id')
        expect(fee).toHaveProperty('name')
        expect(fee).toHaveProperty('type')
        expect(fee).toHaveProperty('value')
        expect(fee).toHaveProperty('description')
        expect(fee).toHaveProperty('displayOrder')
        expect(fee).toHaveProperty('isActive')
        expect(fee).toHaveProperty('createdAt')
        expect(fee).toHaveProperty('updatedAt')

        expect(typeof fee.id).toBe('string')
        expect(typeof fee.name).toBe('string')
        expect(['fixed', 'range', 'percentage']).toContain(fee.type)
        expect(typeof fee.description).toBe('string')
        expect(typeof fee.displayOrder).toBe('number')
        expect(typeof fee.isActive).toBe('boolean')
        expect(fee.createdAt).toBeInstanceOf(Date)
        expect(fee.updatedAt).toBeInstanceOf(Date)
      })
    })

    it('should have valid value types based on fee type', () => {
      defaultAdditionalFees.forEach((fee) => {
        switch (fee.type) {
          case 'fixed':
            expect(typeof fee.value).toBe('number')
            break
          case 'range':
            expect(fee.value).toHaveProperty('min')
            expect(fee.value).toHaveProperty('max')
            if (typeof fee.value === 'object' && fee.value !== null && 'min' in fee.value && 'max' in fee.value) {
              expect(typeof fee.value.min).toBe('number')
              expect(typeof fee.value.max).toBe('number')
              expect(fee.value.min).toBeLessThanOrEqual(fee.value.max)
            }
            break
          case 'percentage':
            expect(typeof fee.value).toBe('number')
            expect(fee.value).toBeGreaterThanOrEqual(0)
            expect(fee.value).toBeLessThanOrEqual(100)
            break
        }
      })
    })

    it('should have unique fee IDs', () => {
      const ids = defaultAdditionalFees.map((fee) => fee.id)
      const uniqueIds = [...new Set(ids)]
      expect(ids.length).toBe(uniqueIds.length)
    })

    it('should include standard fee types', () => {
      const feeNames = defaultAdditionalFees.map((f) => f.name)
      expect(feeNames.some((name) => name.includes('指名'))).toBe(true)
      expect(feeNames.some((name) => name.includes('交通'))).toBe(true)
    })
  })

  describe('defaultPricingNotes', () => {
    it('should export an array of pricing notes', () => {
      expect(Array.isArray(defaultPricingNotes)).toBe(true)
      expect(defaultPricingNotes.length).toBeGreaterThan(0)
    })

    it('should have string notes', () => {
      defaultPricingNotes.forEach((note) => {
        expect(typeof note).toBe('string')
        expect(note.length).toBeGreaterThan(0)
      })
    })

    it('should include important pricing information', () => {
      const notesText = defaultPricingNotes.join(' ')
      expect(notesText).toContain('税込')
      expect(notesText).toContain('キャンセル')
      expect(notesText).toContain('支払い')
    })
  })

  describe('data consistency', () => {
    it('should have sequential display orders for courses', () => {
      const orders = defaultCourses.map((c) => c.displayOrder).sort((a, b) => a - b)
      orders.forEach((order, index) => {
        if (index > 0) {
          expect(order).toBeGreaterThanOrEqual(orders[index - 1])
        }
      })
    })

    it('should have sequential display orders for options', () => {
      const orders = defaultOptions.map((o) => o.displayOrder).sort((a, b) => a - b)
      orders.forEach((order, index) => {
        if (index > 0) {
          expect(order).toBeGreaterThanOrEqual(orders[index - 1])
        }
      })
    })

    it('should have all active items by default', () => {
      const allActive = [...defaultCourses, ...defaultOptions, ...defaultAdditionalFees].every(
        (item) => item.isActive
      )

      expect(allActive).toBe(true)
    })
  })
})

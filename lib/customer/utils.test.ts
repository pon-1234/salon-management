import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { calculateAge } from './utils'

describe('Customer Utils', () => {
  describe('calculateAge', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should calculate age correctly when birthday has passed this year', () => {
      vi.setSystemTime(new Date('2024-06-15'))
      const birthDate = new Date('1990-03-20')

      expect(calculateAge(birthDate)).toBe(34)
    })

    it('should calculate age correctly when birthday has not passed this year', () => {
      vi.setSystemTime(new Date('2024-02-15'))
      const birthDate = new Date('1990-03-20')

      expect(calculateAge(birthDate)).toBe(33)
    })

    it('should calculate age correctly on birthday', () => {
      vi.setSystemTime(new Date('2024-03-20'))
      const birthDate = new Date('1990-03-20')

      expect(calculateAge(birthDate)).toBe(34)
    })

    it('should calculate age correctly for leap year birthdays', () => {
      vi.setSystemTime(new Date('2024-03-01'))
      const birthDate = new Date('2000-02-29')

      expect(calculateAge(birthDate)).toBe(24)
    })

    it('should handle future dates (negative age)', () => {
      vi.setSystemTime(new Date('2024-01-01'))
      const birthDate = new Date('2025-01-01')

      expect(calculateAge(birthDate)).toBe(-1)
    })

    it('should calculate age for someone born today', () => {
      const today = new Date('2024-03-20')
      vi.setSystemTime(today)
      const birthDate = new Date('2024-03-20')

      expect(calculateAge(birthDate)).toBe(0)
    })
  })
})

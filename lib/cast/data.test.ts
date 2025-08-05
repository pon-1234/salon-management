import { describe, it, expect, vi, beforeEach } from 'vitest'
import { castMembers, getAllCasts, getCastById, generateCastSchedule } from './data'

describe('Cast Data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('castMembers', () => {
    it('should export an array of cast members', () => {
      expect(Array.isArray(castMembers)).toBe(true)
      expect(castMembers.length).toBeGreaterThan(0)
    })

    it('should have valid cast member structure', () => {
      castMembers.forEach((cast) => {
        expect(cast).toHaveProperty('id')
        expect(cast).toHaveProperty('name')
        expect(cast).toHaveProperty('nameKana')
        expect(cast).toHaveProperty('age')
        expect(cast).toHaveProperty('height')
        expect(cast).toHaveProperty('bust')
        expect(cast).toHaveProperty('waist')
        expect(cast).toHaveProperty('hip')
        expect(cast).toHaveProperty('type')
        expect(cast).toHaveProperty('image')
        expect(cast).toHaveProperty('images')
        expect(cast).toHaveProperty('description')
        expect(cast).toHaveProperty('netReservation')
        expect(cast).toHaveProperty('workStatus')
        expect(cast).toHaveProperty('workStart')
        expect(cast).toHaveProperty('workEnd')
        expect(cast).toHaveProperty('appointments')
        expect(cast).toHaveProperty('availableOptions')
        expect(cast).toHaveProperty('createdAt')
        expect(cast).toHaveProperty('updatedAt')
      })
    })

    it('should have unique cast IDs', () => {
      const ids = castMembers.map((cast) => cast.id)
      const uniqueIds = [...new Set(ids)]
      expect(ids.length).toBe(uniqueIds.length)
    })
  })

  describe('getAllCasts', () => {
    it('should return all cast members', () => {
      const result = getAllCasts()
      expect(result).toEqual(castMembers)
      expect(result.length).toBe(castMembers.length)
    })
  })

  describe('getCastById', () => {
    it('should return a cast member by ID', () => {
      const cast = getCastById('1')
      expect(cast).toBeDefined()
      expect(cast?.id).toBe('1')
      expect(cast?.name).toBe('みるく')
    })

    it('should return undefined for non-existent ID', () => {
      const cast = getCastById('non-existent')
      expect(cast).toBeUndefined()
    })
  })

  describe('generateCastSchedule', () => {
    it('should generate schedule for a valid cast', () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-03')
      const schedule = generateCastSchedule('1', startDate, endDate)

      expect(schedule).toHaveLength(3)
      schedule.forEach((daySchedule) => {
        expect(daySchedule.castId).toBe('1')
        expect(daySchedule.date).toBeInstanceOf(Date)
        expect(daySchedule.startTime).toBeInstanceOf(Date)
        expect(daySchedule.endTime).toBeInstanceOf(Date)
        expect(daySchedule.bookings).toBe(0)
      })
    })

    it('should return empty array for non-existent cast', () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-03')
      const schedule = generateCastSchedule('non-existent', startDate, endDate)

      expect(schedule).toEqual([])
    })

    it('should handle single day schedule', () => {
      const date = new Date('2024-01-01')
      const schedule = generateCastSchedule('1', date, date)

      expect(schedule).toHaveLength(1)
      expect(schedule[0].date.toDateString()).toBe(date.toDateString())
    })

    it('should correctly set work hours from cast data', () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-01')
      const schedule = generateCastSchedule('1', startDate, endDate)

      const cast = getCastById('1')
      expect(schedule[0].startTime.getHours()).toBe(cast?.workStart?.getHours())
      expect(schedule[0].endTime.getHours()).toBe(cast?.workEnd?.getHours())
    })
  })
})

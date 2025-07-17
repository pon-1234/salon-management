import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CastScheduleUseCases } from './usecases'
import { CastScheduleRepositoryImpl } from './repository-impl'
import type { CastRepository } from '../cast/repository'
import type { Cast } from '../cast/types'
import { generateId } from '../shared'
import { startOfWeek } from 'date-fns'

// Mock CastRepository implementation for testing
class MockCastRepository implements CastRepository {
  private casts: Map<string, Cast> = new Map()

  async getAll(): Promise<Cast[]> {
    return Array.from(this.casts.values())
  }

  async getById(id: string): Promise<Cast | null> {
    return this.casts.get(id) || null
  }

  async create(data: Omit<Cast, 'id' | 'createdAt' | 'updatedAt'>): Promise<Cast> {
    const now = new Date()
    const cast: Cast = {
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }
    this.casts.set(cast.id, cast)
    return cast
  }

  async update(id: string, data: Partial<Cast>): Promise<Cast | null> {
    const cast = this.casts.get(id)
    if (!cast) return null

    const updated = {
      ...cast,
      ...data,
      id,
      createdAt: cast.createdAt,
      updatedAt: new Date(),
    }
    this.casts.set(id, updated)
    return updated
  }

  async delete(id: string): Promise<boolean> {
    return this.casts.delete(id)
  }

  async getCastSchedule(castId: string, startDate: Date, endDate: Date): Promise<any[]> {
    return []
  }

  async updateCastSchedule(castId: string, schedule: any[]): Promise<void> {
    // Mock implementation
  }
}

describe('CastScheduleUseCases', () => {
  let useCases: CastScheduleUseCases
  let scheduleRepository: CastScheduleRepositoryImpl
  let castRepository: MockCastRepository

  beforeEach(() => {
    scheduleRepository = new CastScheduleRepositoryImpl()
    castRepository = new MockCastRepository()
    useCases = new CastScheduleUseCases(scheduleRepository, castRepository)
  })

  describe('getWeeklyScheduleView', () => {
    it('should return weekly schedule view for all casts', async () => {
      // Create test casts
      const cast1 = await castRepository.create({
        name: 'テストキャスト1',
        nameKana: 'テストキャスト1',
        age: 25,
        height: 165,
        bust: 'C',
        waist: 58,
        hip: 85,
        type: 'スタンダード',
        image: '/images/cast1.jpg',
        images: [],
        description: 'テスト',
        netReservation: true,
        specialDesignationFee: 5000,
        regularDesignationFee: 3000,
        panelDesignationRank: 1,
        regularDesignationRank: 1,
        workStatus: '出勤',
        appointments: [],
        availableOptions: [],
      })

      // Create schedules for the week
      const weekStart = new Date('2024-01-15') // Monday
      await scheduleRepository.createSchedule({
        castId: cast1.id,
        date: new Date('2024-01-15'),
        shifts: [],
        isHoliday: false,
      })

      const shift = await scheduleRepository.createShift(
        (await scheduleRepository.findSchedulesByCastId(cast1.id, weekStart, weekStart))[0].id,
        {
          startTime: '10:00',
          endTime: '18:00',
          status: 'confirmed',
        }
      )

      const view = await useCases.getWeeklyScheduleView(weekStart)

      expect(view.weekStartDate.getDay()).toBe(1) // Monday
      expect(view.schedules.length).toBeGreaterThanOrEqual(1)
      expect(view.schedules[0].castId).toBe(cast1.id)
      expect(view.schedules[0].castName).toBe('テストキャスト1')
      expect(view.schedules[0].dailySchedules).toHaveLength(7) // 7 days in a week
      expect(view.schedules[0].dailySchedules[0].shifts).toHaveLength(1)
    })
  })

  describe('createScheduleFromPattern', () => {
    it('should create schedules from pattern for a month', async () => {
      const cast = await castRepository.create({
        name: 'パターンテストキャスト',
        nameKana: 'パターンテストキャスト',
        age: 25,
        height: 165,
        bust: 'C',
        waist: 58,
        hip: 85,
        type: 'スタンダード',
        image: '/images/cast1.jpg',
        images: [],
        description: 'テスト',
        netReservation: true,
        specialDesignationFee: 5000,
        regularDesignationFee: 3000,
        panelDesignationRank: 1,
        regularDesignationRank: 1,
        workStatus: '出勤',
        appointments: [],
        availableOptions: [],
      })

      // Create a pattern for Mondays
      const pattern = await scheduleRepository.createPattern({
        castId: cast.id,
        name: '月曜定期シフト',
        dayOfWeek: 1, // Monday
        startTime: '10:00',
        endTime: '18:00',
        isActive: true,
      })

      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')

      const schedules = await useCases.createScheduleFromPattern(pattern.id, startDate, endDate)

      // January 2024 has 5 Mondays (1, 8, 15, 22, 29)
      expect(schedules).toHaveLength(5)
      schedules.forEach((schedule) => {
        expect(schedule.date.getDay()).toBe(1) // All should be Monday
        expect(schedule.shifts).toHaveLength(1)
        expect(schedule.shifts[0].startTime).toBe('10:00')
      })
    })
  })

  describe('getScheduleStats', () => {
    it('should calculate schedule statistics', async () => {
      const cast = await castRepository.create({
        name: '統計テストキャスト',
        nameKana: '統計テストキャスト',
        age: 25,
        height: 165,
        bust: 'C',
        waist: 58,
        hip: 85,
        type: 'スタンダード',
        image: '/images/cast1.jpg',
        images: [],
        description: 'テスト',
        netReservation: true,
        specialDesignationFee: 5000,
        regularDesignationFee: 3000,
        panelDesignationRank: 1,
        regularDesignationRank: 1,
        workStatus: '出勤',
        appointments: [],
        availableOptions: [],
      })

      // Create schedules
      const schedule1 = await scheduleRepository.createSchedule({
        castId: cast.id,
        date: new Date('2024-01-15'),
        shifts: [],
        isHoliday: false,
      })
      await scheduleRepository.createShift(schedule1.id, {
        startTime: '10:00',
        endTime: '18:00',
        status: 'confirmed',
      })

      const schedule2 = await scheduleRepository.createSchedule({
        castId: cast.id,
        date: new Date('2024-01-16'),
        shifts: [],
        isHoliday: false,
      })
      await scheduleRepository.createShift(schedule2.id, {
        startTime: '14:00',
        endTime: '22:00',
        status: 'confirmed',
      })

      // Add a holiday
      await scheduleRepository.createSchedule({
        castId: cast.id,
        date: new Date('2024-01-17'),
        shifts: [],
        isHoliday: true,
      })

      const stats = await useCases.getScheduleStats(
        cast.id,
        new Date('2024-01-15'),
        new Date('2024-01-17')
      )

      expect(stats.castId).toBe(cast.id)
      expect(stats.totalWorkDays).toBe(2)
      expect(stats.totalWorkHours).toBe(16) // 8 + 8
      expect(stats.averageWorkHoursPerDay).toBe(8)
      expect(stats.holidayCount).toBe(1)
    })
  })

  describe('handleLeaveRequest', () => {
    it('should handle leave request and update schedules', async () => {
      const cast = await castRepository.create({
        name: '休暇申請テストキャスト',
        nameKana: '休暇申請テストキャスト',
        age: 25,
        height: 165,
        bust: 'C',
        waist: 58,
        hip: 85,
        type: 'スタンダード',
        image: '/images/cast1.jpg',
        images: [],
        description: 'テスト',
        netReservation: true,
        specialDesignationFee: 5000,
        regularDesignationFee: 3000,
        panelDesignationRank: 1,
        regularDesignationRank: 1,
        workStatus: '出勤',
        appointments: [],
        availableOptions: [],
      })

      // Create schedule that will be affected by leave
      const schedule = await scheduleRepository.createSchedule({
        castId: cast.id,
        date: new Date('2024-01-20'),
        shifts: [],
        isHoliday: false,
      })
      await scheduleRepository.createShift(schedule.id, {
        startTime: '10:00',
        endTime: '18:00',
        status: 'confirmed',
      })

      // Create leave request
      const leaveRequest = await scheduleRepository.createLeaveRequest({
        castId: cast.id,
        startDate: new Date('2024-01-20'),
        endDate: new Date('2024-01-22'),
        reason: '私用のため',
        status: 'pending',
        approvedBy: null,
        approvedAt: null,
      })

      // Approve leave request
      const result = await useCases.handleLeaveRequest(leaveRequest.id, 'approved', 'manager-1')

      expect(result.status).toBe('approved')
      expect(result.approvedBy).toBe('manager-1')

      // Check that schedule is updated to holiday
      const updatedSchedule = await scheduleRepository.findScheduleById(schedule.id)
      expect(updatedSchedule?.isHoliday).toBe(true)
      expect(updatedSchedule?.shifts).toHaveLength(0)
    })

    it('should check permissions when handling leave request', async () => {
      const cast = await castRepository.create({
        name: '権限テストキャスト',
        nameKana: '権限テストキャスト',
        age: 25,
        height: 165,
        bust: 'C',
        waist: 58,
        hip: 85,
        type: 'スタンダード',
        image: '/images/cast1.jpg',
        images: [],
        description: 'テスト',
        netReservation: true,
        specialDesignationFee: 5000,
        regularDesignationFee: 3000,
        panelDesignationRank: 1,
        regularDesignationRank: 1,
        workStatus: '出勤',
        appointments: [],
        availableOptions: [],
      })

      const leaveRequest = await scheduleRepository.createLeaveRequest({
        castId: cast.id,
        startDate: new Date('2024-01-20'),
        endDate: new Date('2024-01-22'),
        reason: '私用のため',
        status: 'pending',
        approvedBy: null,
        approvedAt: null,
      })

      // Test with admin user (should succeed)
      const adminUser = { id: 'admin-1', role: 'admin' as const }
      const result = await useCases.handleLeaveRequest(
        leaveRequest.id,
        'approved',
        'admin-1',
        adminUser
      )
      expect(result.status).toBe('approved')

      // Create another leave request for rejection test
      const leaveRequest2 = await scheduleRepository.createLeaveRequest({
        castId: cast.id,
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-03'),
        reason: '体調不良',
        status: 'pending',
        approvedBy: null,
        approvedAt: null,
      })

      // Test with unauthorized user (should fail)
      const castUser = { id: 'cast-2', role: 'cast' as const }
      await expect(
        useCases.handleLeaveRequest(leaveRequest2.id, 'approved', 'cast-2', castUser)
      ).rejects.toThrow('User does not have permission to approve/reject leave requests')
    })
  })

  describe('checkScheduleConflicts', () => {
    it('should detect schedule conflicts', async () => {
      const cast = await castRepository.create({
        name: 'コンフリクトテストキャスト',
        nameKana: 'コンフリクトテストキャスト',
        age: 25,
        height: 165,
        bust: 'C',
        waist: 58,
        hip: 85,
        type: 'スタンダード',
        image: '/images/cast1.jpg',
        images: [],
        description: 'テスト',
        netReservation: true,
        specialDesignationFee: 5000,
        regularDesignationFee: 3000,
        panelDesignationRank: 1,
        regularDesignationRank: 1,
        workStatus: '出勤',
        appointments: [],
        availableOptions: [],
      })

      const schedule = await scheduleRepository.createSchedule({
        castId: cast.id,
        date: new Date('2024-01-15'),
        shifts: [],
        isHoliday: false,
      })

      await scheduleRepository.createShift(schedule.id, {
        startTime: '10:00',
        endTime: '15:00',
        status: 'confirmed',
      })

      // Check for conflict with overlapping time
      const hasConflict = await useCases.checkScheduleConflicts(
        cast.id,
        new Date('2024-01-15'),
        '14:00',
        '18:00'
      )

      expect(hasConflict).toBe(true)

      // Check for no conflict
      const noConflict = await useCases.checkScheduleConflicts(
        cast.id,
        new Date('2024-01-15'),
        '16:00',
        '20:00'
      )

      expect(noConflict).toBe(false)
    })

    it('should handle overnight shifts (crossing midnight)', async () => {
      const cast = await castRepository.create({
        name: '深夜勤務テストキャスト',
        nameKana: '深夜勤務テストキャスト',
        age: 25,
        height: 165,
        bust: 'C',
        waist: 58,
        hip: 85,
        type: 'スタンダード',
        image: '/images/cast1.jpg',
        images: [],
        description: 'テスト',
        netReservation: true,
        specialDesignationFee: 5000,
        regularDesignationFee: 3000,
        panelDesignationRank: 1,
        regularDesignationRank: 1,
        workStatus: '出勤',
        appointments: [],
        availableOptions: [],
      })

      const schedule = await scheduleRepository.createSchedule({
        castId: cast.id,
        date: new Date('2024-01-15'),
        shifts: [],
        isHoliday: false,
      })

      // Create overnight shift from 22:00 to 02:00
      await scheduleRepository.createShift(schedule.id, {
        startTime: '22:00',
        endTime: '02:00',
        status: 'confirmed',
      })

      // Check for conflict with late night shift
      const hasConflict1 = await useCases.checkScheduleConflicts(
        cast.id,
        new Date('2024-01-15'),
        '23:00',
        '01:00'
      )
      expect(hasConflict1).toBe(true)

      // Check for conflict with early morning shift
      const hasConflict2 = await useCases.checkScheduleConflicts(
        cast.id,
        new Date('2024-01-15'),
        '01:00',
        '03:00'
      )
      expect(hasConflict2).toBe(true)

      // Check for no conflict with afternoon shift
      const noConflict = await useCases.checkScheduleConflicts(
        cast.id,
        new Date('2024-01-15'),
        '14:00',
        '20:00'
      )
      expect(noConflict).toBe(false)
    })

    it('should detect conflicts between multiple overnight shifts', async () => {
      const cast = await castRepository.create({
        name: '複数深夜勤務テストキャスト',
        nameKana: '複数深夜勤務テストキャスト',
        age: 25,
        height: 165,
        bust: 'C',
        waist: 58,
        hip: 85,
        type: 'スタンダード',
        image: '/images/cast1.jpg',
        images: [],
        description: 'テスト',
        netReservation: true,
        specialDesignationFee: 5000,
        regularDesignationFee: 3000,
        panelDesignationRank: 1,
        regularDesignationRank: 1,
        workStatus: '出勤',
        appointments: [],
        availableOptions: [],
      })

      const schedule = await scheduleRepository.createSchedule({
        castId: cast.id,
        date: new Date('2024-01-15'),
        shifts: [],
        isHoliday: false,
      })

      // Create first overnight shift
      await scheduleRepository.createShift(schedule.id, {
        startTime: '21:00',
        endTime: '01:00',
        status: 'confirmed',
      })

      // Check for conflict with another overnight shift
      const hasConflict = await useCases.checkScheduleConflicts(
        cast.id,
        new Date('2024-01-15'),
        '23:00',
        '03:00'
      )
      expect(hasConflict).toBe(true)

      // Check for no conflict with non-overlapping overnight shift
      const noConflict = await useCases.checkScheduleConflicts(
        cast.id,
        new Date('2024-01-15'),
        '02:00',
        '05:00'
      )
      expect(noConflict).toBe(false)
    })
  })

  describe('getWeeklySchedule API integration', () => {
    beforeEach(() => {
      // Reset to use CastScheduleUseCases without repositories for API calls
      useCases = new CastScheduleUseCases()
      vi.restoreAllMocks()
    })

    it('should fetch and transform cast and schedule data from API', async () => {
      const testDate = new Date('2024-01-15') // A Monday
      const weekStart = startOfWeek(testDate, { weekStartsOn: 1 })

      // Mock cast data
      const mockCasts = [
        {
          id: '1',
          name: 'Test Cast 1',
          age: 25,
          image: '/test1.jpg',
        },
        {
          id: '2',
          name: 'Test Cast 2',
          age: 28,
          image: '/test2.jpg',
        },
      ]

      // Mock schedule data
      const mockSchedules = [
        {
          id: 'sched1',
          castId: '1',
          date: '2024-01-15T00:00:00.000Z',
          startTime: '2024-01-15T10:00:00.000Z',
          endTime: '2024-01-15T18:00:00.000Z',
          isAvailable: true,
        },
        {
          id: 'sched2',
          castId: '1',
          date: '2024-01-17T00:00:00.000Z',
          startTime: '2024-01-17T14:00:00.000Z',
          endTime: '2024-01-17T22:00:00.000Z',
          isAvailable: true,
        },
        {
          id: 'sched3',
          castId: '2',
          date: '2024-01-16T00:00:00.000Z',
          startTime: '2024-01-16T12:00:00.000Z',
          endTime: '2024-01-16T20:00:00.000Z',
          isAvailable: true,
        },
      ]

      // Mock fetch
      global.fetch = vi.fn()
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCasts,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSchedules,
        })

      const result = await useCases.getWeeklySchedule({ date: testDate, castFilter: 'all' })

      // Verify API calls
      expect(fetch).toHaveBeenCalledTimes(2)
      expect(fetch).toHaveBeenCalledWith('/api/cast')
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/cast-schedule?startDate='))

      // Verify result structure
      expect(result).toHaveProperty('startDate')
      expect(result).toHaveProperty('endDate')
      expect(result).toHaveProperty('entries')
      expect(result).toHaveProperty('stats')

      // Verify entries
      expect(result.entries).toHaveLength(2)

      const cast1Entry = result.entries.find((e) => e.castId === '1')
      expect(cast1Entry).toBeDefined()
      expect(cast1Entry?.name).toBe('Test Cast 1')
      expect(cast1Entry?.schedule['2024-01-15']).toEqual({
        type: '出勤予定',
        startTime: '10:00',
        endTime: '18:00',
      })
      expect(cast1Entry?.schedule['2024-01-16']).toEqual({ type: '休日' })
      expect(cast1Entry?.schedule['2024-01-17']).toEqual({
        type: '出勤予定',
        startTime: '14:00',
        endTime: '22:00',
      })

      // Verify stats
      expect(result.stats.totalCast).toBe(2)
      expect(result.stats.workingCast).toBe(2)
    })

    it('should handle API errors gracefully and fallback to mock data', async () => {
      const testDate = new Date('2024-01-15')

      // Mock fetch to fail
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'))

      const result = await useCases.getWeeklySchedule({ date: testDate, castFilter: 'all' })

      // Should fallback to mock data
      expect(result).toBeDefined()
      expect(result.entries).toBeDefined()
      expect(result.entries.length).toBeGreaterThan(0)
    })

    it('should handle empty data correctly', async () => {
      const testDate = new Date('2024-01-15')

      // Mock empty responses
      global.fetch = vi.fn()
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        })

      const result = await useCases.getWeeklySchedule({ date: testDate, castFilter: 'all' })

      expect(result.entries).toHaveLength(0)
      expect(result.stats.totalCast).toBe(0)
      expect(result.stats.workingCast).toBe(0)
      expect(result.stats.averageWorkingHours).toBe(0)
      expect(result.stats.averageWorkingCast).toBe(0)
    })

    it('should calculate statistics correctly', async () => {
      const testDate = new Date('2024-01-15')

      const mockCasts = [
        { id: '1', name: 'Cast 1', age: 25, image: '/test1.jpg' },
        { id: '2', name: 'Cast 2', age: 28, image: '/test2.jpg' },
        { id: '3', name: 'Cast 3', age: 30, image: '/test3.jpg' },
      ]

      const mockSchedules = [
        // Cast 1: Works 3 days, 8 hours each
        {
          castId: '1',
          date: '2024-01-15T00:00:00.000Z',
          startTime: '2024-01-15T10:00:00.000Z',
          endTime: '2024-01-15T18:00:00.000Z',
        },
        {
          castId: '1',
          date: '2024-01-17T00:00:00.000Z',
          startTime: '2024-01-17T10:00:00.000Z',
          endTime: '2024-01-17T18:00:00.000Z',
        },
        {
          castId: '1',
          date: '2024-01-19T00:00:00.000Z',
          startTime: '2024-01-19T10:00:00.000Z',
          endTime: '2024-01-19T18:00:00.000Z',
        },
        // Cast 2: Works 2 days, overnight shift
        {
          castId: '2',
          date: '2024-01-16T00:00:00.000Z',
          startTime: '2024-01-16T20:00:00.000Z',
          endTime: '2024-01-16T02:00:00.000Z', // Next day
        },
        {
          castId: '2',
          date: '2024-01-18T00:00:00.000Z',
          startTime: '2024-01-18T20:00:00.000Z',
          endTime: '2024-01-18T03:00:00.000Z', // Next day
        },
        // Cast 3: No schedule (holiday all week)
      ]

      global.fetch = vi.fn()
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCasts,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSchedules,
        })

      const result = await useCases.getWeeklySchedule({ date: testDate, castFilter: 'all' })

      expect(result.stats.totalCast).toBe(3)
      expect(result.stats.workingCast).toBe(2) // Only Cast 1 and 2 work
      // Cast 1: 3 days * 8 hours = 24 hours
      // Cast 2: 6 hours + 7 hours = 13 hours
      // Average: (24 + 13) / 2 = 18.5 hours
      expect(result.stats.averageWorkingHours).toBeCloseTo(18.5, 1)
      expect(result.stats.averageWorkingCast).toBeCloseTo(0.7, 1) // 5 working days / 7 days
    })
  })
})

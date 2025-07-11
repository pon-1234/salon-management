import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CastScheduleUseCases } from './usecases'
import { CastScheduleRepositoryImpl } from './repository-impl'
import type { CastRepository } from '../cast/repository'
import type { Cast } from '../cast/types'
import { generateId } from '../shared'

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
  })
})

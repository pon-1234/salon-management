import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getModificationHistory, getModificationAlerts, recordModification } from './data'

describe('Modification History Data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getModificationHistory', () => {
    it('should return modification history for a specific reservation', () => {
      const history = getModificationHistory('1')

      expect(Array.isArray(history)).toBe(true)
      expect(history.length).toBeGreaterThan(0)

      history.forEach((item) => {
        expect(item.reservationId).toBe('1')
        expect(item).toHaveProperty('id')
        expect(item).toHaveProperty('userId')
        expect(item).toHaveProperty('userName')
        expect(item).toHaveProperty('fieldName')
        expect(item).toHaveProperty('fieldDisplayName')
        expect(item).toHaveProperty('oldValue')
        expect(item).toHaveProperty('newValue')
        expect(item).toHaveProperty('reason')
        expect(item).toHaveProperty('ipAddress')
        expect(item).toHaveProperty('userAgent')
        expect(item).toHaveProperty('sessionId')
        expect(item).toHaveProperty('timestamp')
        expect(item.timestamp).toBeInstanceOf(Date)
      })
    })

    it('should return empty array for non-existent reservation', () => {
      const history = getModificationHistory('non-existent')
      expect(history).toEqual([])
    })

    it('should have valid modification history data', () => {
      const history = getModificationHistory('1')

      expect(history.some((h) => h.fieldName === 'status')).toBe(true)
      expect(history.some((h) => h.fieldName === 'staff')).toBe(true)
    })
  })

  describe('getModificationAlerts', () => {
    it('should return alerts for a specific reservation', () => {
      const alerts = getModificationAlerts('1')

      expect(Array.isArray(alerts)).toBe(true)
      expect(alerts.length).toBeGreaterThan(0)

      alerts.forEach((alert) => {
        expect(alert.reservationId).toBe('1')
        expect(alert).toHaveProperty('id')
        expect(alert).toHaveProperty('type')
        expect(alert).toHaveProperty('message')
        expect(alert).toHaveProperty('timestamp')
        expect(alert).toHaveProperty('isRead')
        expect(['info', 'warning', 'error']).toContain(alert.type)
        expect(alert.timestamp).toBeInstanceOf(Date)
        expect(typeof alert.isRead).toBe('boolean')
      })
    })

    it('should return empty array for non-existent reservation', () => {
      const alerts = getModificationAlerts('non-existent')
      expect(alerts).toEqual([])
    })

    it('should have different types of alerts', () => {
      const alerts = getModificationAlerts('1')

      const types = alerts.map((a) => a.type)
      expect(types).toContain('warning')
      expect(types).toContain('info')
    })
  })

  describe('recordModification', () => {
    it('should add a new modification record', () => {
      const initialHistory = getModificationHistory('test-reservation')
      const initialCount = initialHistory.length

      recordModification(
        'test-reservation',
        'user_002',
        'テストユーザー',
        'time',
        '時間',
        '10:00',
        '11:00',
        'テスト変更',
        '192.168.1.1',
        'Test User Agent',
        'test-session'
      )

      const updatedHistory = getModificationHistory('test-reservation')
      expect(updatedHistory.length).toBe(initialCount + 1)

      const newRecord = updatedHistory[updatedHistory.length - 1]
      expect(newRecord.reservationId).toBe('test-reservation')
      expect(newRecord.userId).toBe('user_002')
      expect(newRecord.userName).toBe('テストユーザー')
      expect(newRecord.fieldName).toBe('time')
      expect(newRecord.fieldDisplayName).toBe('時間')
      expect(newRecord.oldValue).toBe('10:00')
      expect(newRecord.newValue).toBe('11:00')
      expect(newRecord.reason).toBe('テスト変更')
      expect(newRecord.ipAddress).toBe('192.168.1.1')
      expect(newRecord.userAgent).toBe('Test User Agent')
      expect(newRecord.sessionId).toBe('test-session')
      expect(newRecord.timestamp).toBeInstanceOf(Date)
    })

    it('should create an alert when status changes to modifiable', () => {
      const initialAlerts = getModificationAlerts('test-reservation-2')
      const initialAlertCount = initialAlerts.length

      recordModification(
        'test-reservation-2',
        'user_003',
        'アドミン',
        'status',
        'ステータス',
        'confirmed',
        'modifiable',
        'お客様要請',
        '192.168.1.2',
        'Admin User Agent',
        'admin-session'
      )

      const updatedAlerts = getModificationAlerts('test-reservation-2')
      expect(updatedAlerts.length).toBe(initialAlertCount + 1)

      const newAlert = updatedAlerts[updatedAlerts.length - 1]
      expect(newAlert.reservationId).toBe('test-reservation-2')
      expect(newAlert.type).toBe('info')
      expect(newAlert.message).toContain('修正可能状態')
      expect(newAlert.isRead).toBe(false)
      expect(newAlert.timestamp).toBeInstanceOf(Date)
    })

    it('should not create an alert for non-status modifications', () => {
      const initialAlerts = getModificationAlerts('test-reservation-3')
      const initialAlertCount = initialAlerts.length

      recordModification(
        'test-reservation-3',
        'user_004',
        'ユーザー',
        'course',
        'コース',
        'コースA',
        'コースB',
        'コース変更',
        '192.168.1.3',
        'User Agent',
        'user-session'
      )

      const updatedAlerts = getModificationAlerts('test-reservation-3')
      expect(updatedAlerts.length).toBe(initialAlertCount)
    })

    it('should generate unique IDs', () => {
      // Add multiple modifications
      for (let i = 0; i < 3; i++) {
        recordModification(
          'test-reservation-unique',
          'user_test',
          'テスト',
          'field',
          'フィールド',
          `old${i}`,
          `new${i}`,
          'テスト',
          '127.0.0.1',
          'Test',
          'test'
        )
      }

      const history = getModificationHistory('test-reservation-unique')
      const ids = history.map((h) => h.id)
      const uniqueIds = [...new Set(ids)]

      expect(ids.length).toBe(uniqueIds.length)
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCourseById, getOptionById, getOptionByIdAsync } from './utils'
import { courses, options, getOptions } from './data'

vi.mock('./data', () => ({
  courses: [
    { id: '1', name: 'Course 1', description: 'Test course 1', duration: 60, price: 1000 },
    { id: '2', name: 'Course 2', description: 'Test course 2', duration: 90, price: 2000 },
  ],
  options: [
    { id: 'opt1', name: 'Option 1', description: 'Test option 1', price: 500 },
    { id: 'opt2', name: 'Option 2', description: 'Test option 2', price: 1000 },
  ],
  getOptions: vi.fn(),
}))

describe('Course Option Utils', () => {
  describe('getCourseById', () => {
    it('should return the course when found', () => {
      const result = getCourseById('1')

      expect(result).toEqual({
        id: '1',
        name: 'Course 1',
        description: 'Test course 1',
        duration: 60,
        price: 1000,
      })
    })

    it('should return undefined when course not found', () => {
      const result = getCourseById('999')

      expect(result).toBeUndefined()
    })

    it('should handle empty string id', () => {
      const result = getCourseById('')

      expect(result).toBeUndefined()
    })
  })

  describe('getOptionById', () => {
    it('should return the option when found', () => {
      const result = getOptionById('opt1')

      expect(result).toEqual({
        id: 'opt1',
        name: 'Option 1',
        description: 'Test option 1',
        price: 500,
      })
    })

    it('should return undefined when option not found', () => {
      const result = getOptionById('999')

      expect(result).toBeUndefined()
    })

    it('should handle empty string id', () => {
      const result = getOptionById('')

      expect(result).toBeUndefined()
    })
  })

  describe('getOptionByIdAsync', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should return the option when found', async () => {
      const mockOptions = [
        { id: 'async1', name: 'Async Option 1', description: 'Test async option 1', price: 750 },
        { id: 'async2', name: 'Async Option 2', description: 'Test async option 2', price: 1500 },
      ]
      vi.mocked(getOptions).mockResolvedValue(mockOptions)

      const result = await getOptionByIdAsync('async1')

      expect(result).toEqual({
        id: 'async1',
        name: 'Async Option 1',
        description: 'Test async option 1',
        price: 750,
      })
    })

    it('should return undefined when option not found', async () => {
      const mockOptions = [
        { id: 'async1', name: 'Async Option 1', description: 'Test async option 1', price: 750 },
      ]
      vi.mocked(getOptions).mockResolvedValue(mockOptions)

      const result = await getOptionByIdAsync('999')

      expect(result).toBeUndefined()
    })

    it('should handle empty options array', async () => {
      vi.mocked(getOptions).mockResolvedValue([])

      const result = await getOptionByIdAsync('async1')

      expect(result).toBeUndefined()
    })

    it('should call getOptions to get latest data', async () => {
      const mockOptions = [
        { id: 'async1', name: 'Async Option 1', description: 'Test async option 1', price: 750 },
      ]
      vi.mocked(getOptions).mockResolvedValue(mockOptions)

      await getOptionByIdAsync('async1')

      expect(getOptions).toHaveBeenCalledTimes(1)
    })
  })
})

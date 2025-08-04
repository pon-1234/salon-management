import { describe, it, expect, vi } from 'vitest'
import { getOptionById } from './data'
import { defaultOptions } from '@/lib/pricing/data'

vi.mock('@/lib/pricing/data', () => ({
  defaultOptions: [
    { id: '1', name: '癒やしの膝枕耳かき', description: 'Test option 1', price: 1000 },
    { id: '2', name: '密着洗髪スパ', description: 'Test option 2', price: 2000 },
    { id: '3', name: 'オイル増し増し', description: 'Test option 3', price: 1500 },
    { id: '10', name: '延長30分', description: 'Extension', price: 3000 },
  ],
}))

describe('Options Data', () => {
  describe('getOptionById', () => {
    it('should return option when found by direct ID', () => {
      const result = getOptionById('1')

      expect(result).toEqual({
        id: '1',
        name: '癒やしの膝枕耳かき',
        description: 'Test option 1',
        price: 1000,
      })
    })

    it('should return option when found by mapped ID', () => {
      const result = getOptionById('healing-knee')

      expect(result).toEqual({
        id: '1',
        name: '癒やしの膝枕耳かき',
        description: 'Test option 1',
        price: 1000,
      })
    })

    it('should return option for shampoo-spa mapped ID', () => {
      const result = getOptionById('shampoo-spa')

      expect(result).toEqual({
        id: '2',
        name: '密着洗髪スパ',
        description: 'Test option 2',
        price: 2000,
      })
    })

    it('should return option for extension mapped ID', () => {
      const result = getOptionById('extension')

      expect(result).toEqual({
        id: '10',
        name: '延長30分',
        description: 'Extension',
        price: 3000,
      })
    })

    it('should return undefined when option not found', () => {
      const result = getOptionById('999')

      expect(result).toBeUndefined()
    })

    it('should return undefined for invalid mapped ID', () => {
      const result = getOptionById('invalid-id')

      expect(result).toBeUndefined()
    })

    it('should handle empty string ID', () => {
      const result = getOptionById('')

      expect(result).toBeUndefined()
    })
  })
})

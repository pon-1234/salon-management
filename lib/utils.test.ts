import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn utility function', () => {
  it('should combine class names', () => {
    const result = cn('bg-red-500', 'text-white')
    expect(result).toBe('bg-red-500 text-white')
  })

  it('should handle conditional classes', () => {
    const result = cn('base', false && 'false-class', true && 'true-class')
    expect(result).toBe('base true-class')
  })

  it('should merge Tailwind classes correctly', () => {
    const result = cn('px-2 py-1', 'px-4')
    expect(result).toBe('py-1 px-4')
  })

  it('should handle undefined and null values', () => {
    const result = cn('base', undefined, null, 'end')
    expect(result).toBe('base end')
  })

  it('should handle empty strings', () => {
    const result = cn('', 'valid', '')
    expect(result).toBe('valid')
  })
})
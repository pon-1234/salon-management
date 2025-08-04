import { describe, it, expect } from 'vitest'
import * as dataModule from './data'

describe('Course Option Data', () => {
  it('should export getCourses function', () => {
    expect(dataModule.getCourses).toBeDefined()
    expect(typeof dataModule.getCourses).toBe('function')
  })

  it('should export getOptions function', () => {
    expect(dataModule.getOptions).toBeDefined()
    expect(typeof dataModule.getOptions).toBe('function')
  })

  it('should export courses array', () => {
    expect(dataModule.courses).toBeDefined()
    expect(Array.isArray(dataModule.courses)).toBe(true)
  })

  it('should export options array', () => {
    expect(dataModule.options).toBeDefined()
    expect(Array.isArray(dataModule.options)).toBe(true)
  })
})

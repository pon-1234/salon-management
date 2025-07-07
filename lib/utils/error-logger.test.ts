import { describe, it, expect, vi, afterEach, afterAll } from 'vitest'
import { logError } from './error-logger'

describe('logError', () => {
  // console.errorをモック化
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

  // 各テストの後にスパイをリセット
  afterEach(() => {
    consoleErrorSpy.mockClear()
  })

  // すべてのテストが終わったら元のconsole.errorに戻す
  afterAll(() => {
    consoleErrorSpy.mockRestore()
  })

  it('should log an error with the default message', () => {
    const testError = new Error('Test error')
    logError(testError)

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error caught:', testError)
  })

  it('should log an error with a custom message', () => {
    const testError = new Error('Something went wrong')
    const message = 'A custom message'
    logError(testError, message)

    expect(consoleErrorSpy).toHaveBeenCalledWith(message, testError)
  })

  it('should log an error with context', () => {
    const testError = new Error('Error with context')
    const context = { userId: 123, action: 'submit' }
    logError(testError, 'Error occurred', { context })

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error occurred', testError)
    expect(consoleErrorSpy).toHaveBeenCalledWith('Context:', context)
  })
})

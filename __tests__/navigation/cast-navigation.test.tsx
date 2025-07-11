import { render, screen } from '@testing-library/react'
import { redirect } from 'next/navigation'
import CastDetailRedirect from '@/app/(admin)/admin/cast/[id]/page'
import { vi, describe, it, expect } from 'vitest'

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

describe('Cast Navigation', () => {
  describe('Legacy cast detail page redirect', () => {
    it('should redirect from /admin/cast/[id] to /admin/cast/manage/[id]', async () => {
      const params = Promise.resolve({ id: 'test-cast-id' })

      await CastDetailRedirect({ params })

      expect(redirect).toHaveBeenCalledWith('/admin/cast/manage/test-cast-id')
    })

    it('should handle different cast IDs correctly', async () => {
      const testCases = [{ id: 'cast-1' }, { id: 'cast-2' }, { id: 'new' }, { id: '123' }]

      for (const testCase of testCases) {
        vi.clearAllMocks()
        const params = Promise.resolve(testCase)

        await CastDetailRedirect({ params })

        expect(redirect).toHaveBeenCalledWith(`/admin/cast/manage/${testCase.id}`)
      }
    })
  })
})

/**
 * @design_doc https://app.notion.com/p/3ccdda8d8bde80ec928cc17adff35cde
 * @related_to CourseInfoPage - serialize consecutive reorders while requests are pending
 * @known_issues Synthetic course fixtures only
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import CourseInfoPage from './page'
const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  pricing: { getCourses: vi.fn(), updateCourse: vi.fn() },
}))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }))
vi.mock('@/contexts/store-context', () => ({
  useStore: () => ({ currentStore: { id: 'store-a' } }),
}))
vi.mock('@/lib/pricing', () => ({ getPricingUseCases: () => mocks.pricing }))
it('waits for every update before allowing another reorder and retains the same IDs', async () => {
  const courses = [
    { id: 'a', name: 'A', displayOrder: 0 },
    { id: 'b', name: 'B', displayOrder: 1 },
  ].map((course) => ({
    ...course,
    price: 10000,
    duration: 60,
    isActive: true,
    enableWebBooking: true,
  }))
  mocks.pricing.getCourses.mockResolvedValue(courses)
  const complete: Array<() => void> = []
  mocks.pricing.updateCourse.mockImplementation(
    (id, data) => new Promise((resolve) => complete.push(() => resolve({ id, ...data })))
  )
  render(<CourseInfoPage />)
  fireEvent.click(await screen.findByRole('button', { name: 'Bを上へ移動' }))
  expect(screen.getByRole('button', { name: 'Bを下へ移動' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Aを上へ移動' })).toBeDisabled()
  await act(async () => {
    complete[0]()
  })
  expect(screen.getByRole('button', { name: 'Bを下へ移動' })).toBeDisabled()
  await act(async () => {
    complete[1]()
  })
  await waitFor(() => expect(screen.getByRole('button', { name: 'Bを下へ移動' })).toBeEnabled())
  fireEvent.click(screen.getByRole('button', { name: 'Bを下へ移動' }))
  expect(mocks.pricing.updateCourse.mock.calls.map((call) => call[0])).toEqual(['b', 'a', 'a', 'b'])
  await act(async () => {
    complete[2]()
    complete[3]()
  })
})

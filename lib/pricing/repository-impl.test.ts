/**
 * @design_doc   Multi-store pricing request routing
 * @related_to   PricingRepositoryImpl and admin pricing settings pages
 * @known_issues None currently
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PricingRepositoryImpl } from './repository-impl'

vi.mock('@/lib/http/base-url', () => ({
  resolveApiUrl: (path: string) => path,
}))

describe('PricingRepositoryImpl store routing', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        async () =>
          new Response(
            JSON.stringify({
              id: 'price-1',
              name: 'Price',
              duration: 60,
              price: 10000,
              isActive: true,
              enableWebBooking: true,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
      )
    )
  })

  it('adds the selected store to course create, update, and delete requests', async () => {
    const repository = new PricingRepositoryImpl()
    const course = {
      name: 'Price',
      duration: 60,
      price: 10000,
      isActive: true,
      enableWebBooking: true,
    }

    await repository.createCourse(course, 'shinjuku west')
    await repository.updateCourse('course/1', { price: 11000 }, 'shinjuku west')
    await repository.deleteCourse('course/1', 'shinjuku west')

    const fetchMock = vi.mocked(fetch)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/course?storeId=shinjuku%20west')
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/course?storeId=shinjuku%20west')
    expect(fetchMock.mock.calls[2]?.[0]).toBe('/api/course?id=course%2F1&storeId=shinjuku%20west')
  })

  it('adds the selected store to option detail and mutation requests', async () => {
    const repository = new PricingRepositoryImpl()

    await repository.getOptionById('option/1', 'ikebukuro')
    await repository.createOption(
      {
        name: 'Option',
        price: 1000,
        category: 'special',
        displayOrder: 1,
        isActive: true,
        visibility: 'public',
      },
      'ikebukuro'
    )
    await repository.updateOption('option/1', { price: 1200 }, 'ikebukuro')
    await repository.deleteOption('option/1', 'ikebukuro')

    const fetchMock = vi.mocked(fetch)
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/option?id=option%2F1&storeId=ikebukuro',
      '/api/option?storeId=ikebukuro',
      '/api/option?storeId=ikebukuro',
      '/api/option?id=option%2F1&storeId=ikebukuro',
    ])
  })

  it('preserves inactive pricing rows returned by the management API', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify([
              {
                id: 'course-active',
                name: 'Active course',
                duration: 60,
                price: 10000,
                isActive: true,
                enableWebBooking: true,
              },
              {
                id: 'course-inactive',
                name: 'Inactive course',
                duration: 90,
                price: 12000,
                isActive: false,
                enableWebBooking: false,
              },
            ]),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify([
              {
                id: 'option-active',
                name: 'Active option',
                price: 1000,
                category: 'special',
                displayOrder: 1,
                isActive: true,
                visibility: 'public',
              },
              {
                id: 'option-inactive',
                name: 'Inactive option',
                price: 0,
                category: 'special',
                displayOrder: 2,
                isActive: false,
                visibility: 'internal',
              },
            ]),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        )
    )

    const repository = new PricingRepositoryImpl()

    await expect(repository.getCourses('ikebukuro')).resolves.toHaveLength(2)
    await expect(repository.getOptions('ikebukuro')).resolves.toHaveLength(2)
  })

  it('preserves the canonical course display order returned by the API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 'course-standard',
              name: '80分',
              displayOrder: 2,
              duration: 80,
              price: 21000,
              isActive: true,
              enableWebBooking: true,
            },
            {
              id: 'course-extension',
              name: '延長30分',
              displayOrder: 13,
              duration: 30,
              price: 8000,
              isActive: true,
              enableWebBooking: false,
            },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    )

    const repository = new PricingRepositoryImpl()

    await expect(repository.getCourses('ikebukuro')).resolves.toMatchObject([
      { id: 'course-standard' },
      { id: 'course-extension' },
    ])
  })
})

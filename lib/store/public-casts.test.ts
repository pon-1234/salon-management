/**
 * @design_doc   Public cast detail is an explicit allowlist with no reservation or credential data
 * @related_to   public-casts.ts and the public cast detail server component
 * @known_issues Public option labels still use the existing option catalog adapter
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ castFindFirst: vi.fn(), castFindMany: vi.fn() }))

vi.mock('@/lib/db', () => ({
  db: {
    cast: { findFirst: mocks.castFindFirst, findMany: mocks.castFindMany },
    review: { groupBy: vi.fn() },
    reservation: { groupBy: vi.fn() },
  },
}))

import { getPublicCastDetail, getPublicCastProfiles } from './public-casts'

describe('getPublicCastProfiles', () => {
  it('fails closed to an empty public list when the database is unavailable', async () => {
    mocks.castFindMany.mockRejectedValueOnce(new Error('database unavailable'))

    await expect(getPublicCastProfiles('store-a')).resolves.toEqual([])
  })
})

describe('getPublicCastDetail', () => {
  beforeEach(() => {
    mocks.castFindFirst.mockReset()
  })

  it('returns only public profile fields even if a database mock supplies private relations', async () => {
    mocks.castFindFirst.mockResolvedValue({
      id: 'cast-1',
      storeId: 'ginza',
      name: 'Alice',
      age: 25,
      height: 160,
      bust: 'E',
      waist: 58,
      hip: 84,
      type: 'standard',
      image: '/alice.jpg',
      images: ['/alice.jpg'],
      description: 'Profile',
      netReservation: true,
      specialDesignationFee: 3000,
      requestAttendanceEnabled: true,
      panelDesignationRank: 1,
      regularDesignationRank: 2,
      workStatus: '出勤',
      availableOptions: ['option-public'],
      publicProfile: null,
      loginEmail: 'private@example.com',
      lineUserId: 'private-line-id',
      passwordHash: 'private-password-hash',
      welfareExpenseRate: 10,
      castOptionSettings: [
        {
          optionId: 'option-public',
          visibility: 'public',
          option: {
            id: 'option-public',
            name: '店舗実オプション',
            description: '移行済み説明',
            price: 2000,
            note: '人気',
          },
        },
        { optionId: 'option-internal', visibility: 'internal' },
      ],
      reservations: [
        {
          customer: {
            name: 'Private Customer',
            phone: '09012345678',
            email: 'customer@example.com',
          },
          price: 20000,
        },
      ],
    })

    const detail = await getPublicCastDetail('ginza', 'cast-1')
    const serialized = JSON.stringify(detail)

    expect(detail).toEqual(
      expect.objectContaining({
        id: 'cast-1',
        name: 'Alice',
        specialDesignationFee: 3000,
        availableOptions: ['option-public'],
        availableOptionSettings: [{ optionId: 'option-public', visibility: 'public' }],
        availableOptionDetails: [
          {
            id: 'option-public',
            name: '店舗実オプション',
            description: '移行済み説明',
            price: 2000,
            note: '人気',
          },
        ],
      })
    )
    expect(detail).not.toHaveProperty('appointments')
    expect(detail).not.toHaveProperty('loginEmail')
    expect(detail).not.toHaveProperty('lineUserId')
    expect(detail).not.toHaveProperty('welfareExpenseRate')
    expect(serialized).not.toContain('Private Customer')
    expect(serialized).not.toContain('09012345678')
    expect(serialized).not.toContain('private-password-hash')
    expect(serialized).not.toContain('option-internal')
    expect(mocks.castFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cast-1', storeId: 'ginza' },
        select: expect.objectContaining({
          id: true,
          name: true,
          castOptionSettings: {
            where: expect.objectContaining({ visibility: 'public' }),
            select: {
              optionId: true,
              visibility: true,
              option: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  price: true,
                  note: true,
                },
              },
            },
          },
        }),
      })
    )
    expect(mocks.castFindFirst.mock.calls[0][0]).not.toHaveProperty('include')
  })

  it('does not expose an incomplete legacy profile as a renderable public profile', async () => {
    mocks.castFindFirst.mockResolvedValue({
      id: 'legacy-cast-56229',
      storeId: 'uat-ikebukuro',
      name: 'Legacy Cast',
      age: 25,
      height: 160,
      bust: '86',
      waist: 58,
      hip: 84,
      type: 'standard',
      image: '/legacy.jpg',
      images: ['/legacy.jpg'],
      description: 'Legacy profile',
      netReservation: true,
      requestAttendanceEnabled: true,
      panelDesignationRank: 0,
      regularDesignationRank: 0,
      workStatus: '出勤',
      availableOptions: [],
      publicProfile: {
        legacyGirlNo: 56229,
        bustCup: 3,
        snapshotCutoff: '2026-07-20T04:00:00.000Z',
      },
      castOptionSettings: [],
    })

    const detail = await getPublicCastDetail('uat-ikebukuro', 'legacy-cast-56229')

    expect(detail?.publicProfile).toBeNull()
    expect(JSON.stringify(detail)).not.toContain('legacyGirlNo')
    expect(JSON.stringify(detail)).not.toContain('snapshotCutoff')
  })
})

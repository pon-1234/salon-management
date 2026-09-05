/**
 * @design_doc https://app.notion.com/p/3ccdda8d8bde80b19a27f2cd7dd8a2d1
 * @related_to resolveDesignationRevenueContext: independent cast bonus selection
 * @known_issues None
 */
import { describe, expect, it, vi } from 'vitest'
import type { Prisma } from '@prisma/client'
import { resolveDesignationRevenueContext } from './cast-take-home-bonus'

describe('cast take-home bonus categories', () => {
  it.each([
    ['フリー', 'free', 'free-bonus', 0],
    ['パネル指名', 'panel', 'panel-bonus', 2000],
    ['おすすめパネル', 'recommend', 'recommend-bonus', 2000],
    ['本指名', 'repeat', 'repeat-bonus', 2000],
  ])(
    'uses the independent bonus for %s without increasing the customer charge',
    async (name, kind, id, amount) => {
      const findFirst = vi
        .fn()
        .mockResolvedValueOnce({ kind, storeShare: 1000, castShare: 1000 })
        .mockResolvedValueOnce({ price: 1500 })
      const result = await resolveDesignationRevenueContext(
        { designationFee: { findFirst } } as unknown as Pick<
          Prisma.TransactionClient,
          'designationFee'
        >,
        {
          storeId: 'store-a',
          designationType: name,
          designationAmount: amount,
          cast: {
            freeTakeHomeBonusId: 'free-bonus',
            panelTakeHomeBonusId: 'panel-bonus',
            recommendedTakeHomeBonusId: 'recommend-bonus',
            regularTakeHomeBonusId: 'repeat-bonus',
          },
        }
      )
      expect(findFirst).toHaveBeenLastCalledWith({
        where: { id, storeId: 'store-a', isActive: true, isTakeHomeBonus: true, kind },
        select: { price: true },
      })
      expect(result.castTakeHomeBonus).toBe(1500)
    }
  )
})

it('applies the free bonus for no-designation bookings without looking up a customer fee', async () => {
  const findFirst = vi.fn().mockResolvedValue({ price: 1000 })
  const result = await resolveDesignationRevenueContext(
    { designationFee: { findFirst } } as unknown as Pick<
      Prisma.TransactionClient,
      'designationFee'
    >,
    {
      storeId: 'store-a',
      designationType: 'none',
      designationAmount: 0,
      cast: { freeTakeHomeBonusId: 'free-bonus' },
    }
  )
  expect(findFirst).toHaveBeenCalledTimes(1)
  expect(findFirst).toHaveBeenCalledWith({
    where: {
      id: 'free-bonus',
      storeId: 'store-a',
      isActive: true,
      isTakeHomeBonus: true,
      kind: 'free',
    },
    select: { price: true },
  })
  expect(result).toEqual({ designationShare: null, castTakeHomeBonus: 1000 })
})

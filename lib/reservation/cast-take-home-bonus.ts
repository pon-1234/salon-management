/**
 * @design_doc   Notion task #282 cast designation take-home settings
 * @related_to   Reservation API revenue calculation and DesignationFee masters
 * @known_issues None
 */
import {
  isDesignationFeeKind,
  inferDesignationKindFromName,
  type DesignationFeeKind,
} from '@/lib/designation/kind'
import type { Prisma } from '@prisma/client'

interface CastTakeHomeSettings {
  freeTakeHomeBonusId?: string | null
  recommendedTakeHomeBonusId?: string | null
  panelTakeHomeBonusId?: string | null
  regularTakeHomeBonusId?: string | null
}

export interface DesignationRevenueContext {
  designationShare: {
    storeShare: number | null
    castShare: number | null
    kind: DesignationFeeKind | null
  } | null
  castTakeHomeBonus: number
}

export async function resolveDesignationRevenueContext(
  client: Pick<Prisma.TransactionClient, 'designationFee'>,
  input: {
    storeId: string
    designationType: string | null | undefined
    designationAmount: number
    cast: CastTakeHomeSettings | null | undefined
  }
): Promise<DesignationRevenueContext> {
  const tier =
    input.designationType &&
    input.designationType !== 'none' &&
    input.designationType !== '指名なし'
      ? await client.designationFee.findFirst({
          where: { storeId: input.storeId, name: input.designationType, isTakeHomeBonus: false },
          select: { storeShare: true, castShare: true, kind: true },
        })
      : null
  const kind =
    tier && isDesignationFeeKind(tier.kind)
      ? tier.kind
      : ['free', 'none', '指名なし'].includes(input.designationType ?? 'none')
        ? 'free'
        : inferDesignationKindFromName(input.designationType)
  const designationShare = tier
    ? {
        storeShare: tier.storeShare ?? null,
        castShare: tier.castShare ?? null,
        kind,
      }
    : null
  const bonusId =
    kind === 'repeat'
      ? input.cast?.regularTakeHomeBonusId
      : kind === 'panel'
        ? input.cast?.panelTakeHomeBonusId
        : kind === 'recommend'
          ? input.cast?.recommendedTakeHomeBonusId
          : kind === 'free'
            ? input.cast?.freeTakeHomeBonusId
            : null
  const bonusTier = bonusId
    ? await client.designationFee.findFirst({
        where: { id: bonusId, storeId: input.storeId, isActive: true, isTakeHomeBonus: true, kind },
        select: { price: true },
      })
    : null

  return {
    designationShare,
    castTakeHomeBonus: Math.max(Number(bonusTier?.price ?? 0), 0),
  }
}

export class StoreDesignationUnavailableError extends Error {}

export async function resolveCreateDesignationAmount(
  client: Pick<Prisma.TransactionClient, 'designationFee'>,
  input: {
    storeId: string
    isAdmin: boolean
    designationFee?: unknown
    designationType?: string | null
    specialDesignationFee?: number | null
  }
): Promise<number> {
  if (input.isAdmin) {
    const requested = Number(input.designationFee)
    return Number.isFinite(requested) ? requested : 0
  }
  if (input.designationType === 'regular') {
    const tier = await client.designationFee.findFirst({
      where: { storeId: input.storeId, kind: 'repeat', isActive: true, isTakeHomeBonus: false },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      select: { price: true },
    })
    if (!tier) throw new StoreDesignationUnavailableError('店舗の本指名料金が設定されていません')
    return Math.max(tier.price, 0)
  }
  return input.designationType === 'special' ? Math.max(input.specialDesignationFee ?? 0, 0) : 0
}

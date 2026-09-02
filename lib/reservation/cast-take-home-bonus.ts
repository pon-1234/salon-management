/**
 * @design_doc   Notion task #282 cast designation take-home settings
 * @related_to   Reservation API revenue calculation and DesignationFee masters
 * @known_issues None
 */
import {
  isDesignationFeeKind,
  isPanelDesignation,
  isRegularDesignation,
  type DesignationFeeKind,
} from '@/lib/designation/kind'
import type { Prisma } from '@prisma/client'

interface CastTakeHomeSettings {
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
    input.designationAmount > 0 && input.designationType
      ? await client.designationFee.findFirst({
          where: { storeId: input.storeId, name: input.designationType },
          select: { storeShare: true, castShare: true, kind: true },
        })
      : null
  const kind = tier && isDesignationFeeKind(tier.kind) ? tier.kind : null
  const designationShare = tier
    ? {
        storeShare: tier.storeShare ?? null,
        castShare: tier.castShare ?? null,
        kind,
      }
    : null
  const bonusId = isRegularDesignation(input.designationType, kind)
    ? input.cast?.regularTakeHomeBonusId
    : isPanelDesignation(input.designationType, kind)
      ? input.cast?.panelTakeHomeBonusId
      : null
  const bonusTier = bonusId
    ? await client.designationFee.findFirst({
        where: { id: bonusId, storeId: input.storeId, isActive: true },
        select: { price: true },
      })
    : null

  return {
    designationShare,
    castTakeHomeBonus: Math.max(Number(bonusTier?.price ?? 0), 0),
  }
}

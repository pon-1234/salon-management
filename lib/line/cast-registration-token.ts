/**
 * @design_doc   Secure administrative issuance of one-time LINE cast registration tokens
 * @related_to   CastLineRegistrationToken model, app/api/cast/line-registration-token/route.ts
 * @known_issues Serializable write conflicts are surfaced for the caller to retry
 */
import { randomBytes as secureRandomBytes } from 'node:crypto'
import { db } from '@/lib/db'
import { hashLineRegistrationToken } from '@/lib/line/cast-registration-service'

const TOKEN_BYTES = 32
const TOKEN_TTL_MILLISECONDS = 15 * 60 * 1000

interface IssuanceTransaction {
  cast: {
    findFirst(args: {
      where: { id: string; storeId: string }
      select: { id: true; storeId: true; lineUserId: true }
    }): Promise<{ id: string; storeId: string; lineUserId: string | null } | null>
    findFirst(args: {
      where: { id: string; storeId: string }
      select: { id: true }
    }): Promise<{ id: string } | null>
    updateMany(args: {
      where: { id: string; storeId: string }
      data: { lineUserId: null }
    }): Promise<{ count: number }>
  }
  castLineRegistrationToken: {
    upsert(args: {
      where: { castId: string }
      create: TokenWrite
      update: Omit<TokenWrite, 'castId'>
    }): Promise<unknown>
    deleteMany(args: { where: { castId: string; storeId: string } }): Promise<{ count: number }>
  }
}

interface TokenWrite {
  castId: string
  storeId: string
  tokenHash: string
  expiresAt: Date
  usedAt: null
  createdByAdminId: string
}

interface IssuanceDatabase {
  $transaction<T>(
    callback: (transaction: IssuanceTransaction) => Promise<T>,
    options: { isolationLevel: 'Serializable' }
  ): Promise<T>
}

export class CastLineRegistrationTokenError extends Error {
  constructor(readonly code: 'cast_not_found' | 'cast_already_linked') {
    super(code)
    this.name = 'CastLineRegistrationTokenError'
  }
}

export async function issueCastLineRegistrationToken(
  input: { castId: string; storeId: string; createdByAdminId: string },
  dependencies: {
    database?: IssuanceDatabase
    now?: () => Date
    randomBytes?: (size: number) => Buffer
  } = {}
): Promise<{ token: string; expiresAt: Date }> {
  const database = dependencies.database ?? (db as unknown as IssuanceDatabase)
  const now = dependencies.now?.() ?? new Date()
  const token = (dependencies.randomBytes ?? secureRandomBytes)(TOKEN_BYTES).toString('base64url')
  const tokenHash = hashLineRegistrationToken(token)
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_MILLISECONDS)

  await database.$transaction(
    async (transaction) => {
      const cast = await transaction.cast.findFirst({
        where: { id: input.castId, storeId: input.storeId },
        select: { id: true, storeId: true, lineUserId: true },
      })

      if (!cast) {
        throw new CastLineRegistrationTokenError('cast_not_found')
      }
      if (cast.lineUserId !== null) {
        throw new CastLineRegistrationTokenError('cast_already_linked')
      }

      const write: TokenWrite = {
        castId: cast.id,
        storeId: cast.storeId,
        tokenHash,
        expiresAt,
        usedAt: null,
        createdByAdminId: input.createdByAdminId,
      }

      await transaction.castLineRegistrationToken.upsert({
        where: { castId: cast.id },
        create: write,
        update: {
          storeId: write.storeId,
          tokenHash: write.tokenHash,
          expiresAt: write.expiresAt,
          usedAt: null,
          createdByAdminId: write.createdByAdminId,
        },
      })
    },
    { isolationLevel: 'Serializable' }
  )

  return { token, expiresAt }
}

export async function unlinkCastLineRegistration(
  input: { castId: string; storeId: string },
  dependencies: { database?: IssuanceDatabase } = {}
): Promise<void> {
  const database = dependencies.database ?? (db as unknown as IssuanceDatabase)

  await database.$transaction(
    async (transaction) => {
      const cast = await transaction.cast.findFirst({
        where: { id: input.castId, storeId: input.storeId },
        select: { id: true },
      })
      if (!cast) {
        throw new CastLineRegistrationTokenError('cast_not_found')
      }

      await transaction.castLineRegistrationToken.deleteMany({
        where: { castId: input.castId, storeId: input.storeId },
      })
      const unlinked = await transaction.cast.updateMany({
        where: { id: input.castId, storeId: input.storeId },
        data: { lineUserId: null },
      })
      if (unlinked.count !== 1) {
        throw new CastLineRegistrationTokenError('cast_not_found')
      }
    },
    { isolationLevel: 'Serializable' }
  )
}

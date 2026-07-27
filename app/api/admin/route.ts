/**
 * @design_doc   Admin management API endpoints
 * @related_to   Admin management settings page, Admin model (Prisma)
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import logger from '@/lib/logger'
import { ADMIN_PASSWORD_MIN_LENGTH } from '@/lib/admin/password-policy'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

const roleEnum = z.enum(['super_admin', 'manager', 'staff'])
const storeIdsSchema = z
  .array(z.string().trim().min(1))
  .max(100)
  .transform((storeIds) => Array.from(new Set(storeIds.map((storeId) => storeId.toLowerCase()))))

const storeAssignmentInclude = {
  storeAssignments: {
    select: { storeId: true },
    orderBy: { storeId: 'asc' as const },
  },
}

const ROLE_PERMISSIONS: Record<z.infer<typeof roleEnum>, string[]> = {
  super_admin: ['*'],
  manager: [
    'cast:*',
    'customer:read',
    'customer:create',
    'customer:update',
    'reservation:*',
    'pricing:*',
    'settings:*',
    'analytics:read',
    'dashboard:view',
  ],
  staff: ['cast:read', 'customer:read', 'reservation:read'],
}

function getPermissionsForRole(role: z.infer<typeof roleEnum>) {
  return ROLE_PERMISSIONS[role] ?? []
}

const createSchema = z
  .object({
    email: z.string().email(),
    name: z.string().min(1),
    password: z.string().min(ADMIN_PASSWORD_MIN_LENGTH),
    role: roleEnum.default('staff'),
    isActive: z.boolean().optional(),
    storeIds: storeIdsSchema.default([]),
  })
  .superRefine((data, context) => {
    if (data.role !== 'super_admin' && data.storeIds.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['storeIds'],
        message: '店舗を1つ以上選択してください',
      })
    }
  })

const updateSchema = z
  .object({
    id: z.string().min(1),
    email: z.string().email().optional(),
    name: z.string().min(1).optional(),
    password: z.string().min(ADMIN_PASSWORD_MIN_LENGTH).optional(),
    role: roleEnum.optional(),
    isActive: z.boolean().optional(),
    storeIds: storeIdsSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 1, {
    message: '更新内容がありません',
    path: ['id'],
  })

function serializeAdmin(admin: any) {
  let permissions: string[] = []
  if (admin.permissions) {
    try {
      const parsed =
        typeof admin.permissions === 'string'
          ? admin.permissions
          : JSON.stringify(admin.permissions)
      permissions = JSON.parse(parsed)
      if (!Array.isArray(permissions)) {
        permissions = []
      }
    } catch {
      permissions = []
    }
  }

  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    permissions,
    storeIds: Array.isArray(admin.storeAssignments)
      ? admin.storeAssignments.map((assignment: { storeId: string }) => assignment.storeId).sort()
      : [],
    isActive: admin.isActive,
    lastLogin: admin.lastLogin ? admin.lastLogin.toISOString() : null,
    createdAt: admin.createdAt.toISOString(),
    updatedAt: admin.updatedAt.toISOString(),
  }
}

async function getAdminSession() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'admin') {
    return { error: NextResponse.json({ error: '認証が必要です' }, { status: 401 }) }
  }

  return { session }
}

function ensureSuperAdmin(session: any) {
  if (session.user?.adminRole !== 'super_admin') {
    return NextResponse.json({ error: 'この操作を行う権限がありません' }, { status: 403 })
  }
  return null
}

function getSafeDatabaseErrorCode(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    /^P\d{4}$/.test(error.code)
  ) {
    return error.code
  }

  return 'UNEXPECTED'
}

function logAdminMutationFailure(operation: 'create' | 'update' | 'deactivate', error: unknown) {
  logger.error(
    { operation, errorCode: getSafeDatabaseErrorCode(error) },
    'Administrator account mutation failed'
  )
}

function isTransactionConflict(error: unknown): boolean {
  return getSafeDatabaseErrorCode(error) === 'P2034'
}

export async function GET() {
  const { session, error } = await getAdminSession()
  if (!session) return error!

  const admins = await db.admin.findMany({
    orderBy: { createdAt: 'desc' },
    include: storeAssignmentInclude,
  })

  return NextResponse.json({
    admins: admins.map(serializeAdmin),
  })
}

export async function POST(request: NextRequest) {
  const { session, error } = await getAdminSession()
  if (!session) return error!

  const authError = ensureSuperAdmin(session)
  if (authError) return authError

  try {
    const payload = await request.json()
    const data = createSchema.parse(payload)

    if (data.role !== 'super_admin') {
      const validStoreCount = await db.store.count({
        where: { id: { in: data.storeIds }, isActive: true },
      })
      if (validStoreCount !== data.storeIds.length) {
        return NextResponse.json({ error: '無効な店舗が含まれています' }, { status: 400 })
      }
    }

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS)

    const admin = await db.admin.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: data.role,
        permissions: JSON.stringify(getPermissionsForRole(data.role)),
        isActive: data.isActive ?? true,
        storeAssignments:
          data.role === 'super_admin'
            ? undefined
            : { create: data.storeIds.map((storeId) => ({ storeId })) },
      },
      include: storeAssignmentInclude,
    })

    return NextResponse.json({ admin: serializeAdmin(admin) }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: '入力内容に不備があります', details: err.issues },
        { status: 400 }
      )
    }

    if ((err as any)?.code === 'P2002') {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 409 }
      )
    }

    logAdminMutationFailure('create', err)
    return NextResponse.json({ error: '管理者の作成に失敗しました' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const { session, error } = await getAdminSession()
  if (!session) return error!

  const authError = ensureSuperAdmin(session)
  if (authError) return authError

  try {
    const payload = await request.json()
    const data = updateSchema.parse(payload)

    const hashedPassword = data.password ? await bcrypt.hash(data.password, SALT_ROUNDS) : undefined

    const result = await db.$transaction(
      async (transaction) => {
        const existing = await transaction.admin.findUnique({
          where: { id: data.id },
          include: storeAssignmentInclude,
        })
        if (!existing) return { status: 'not_found' as const }

        const updateData: Record<string, any> = {}

        if (data.email && data.email !== existing.email) {
          updateData.email = data.email
        }
        if (data.name && data.name !== existing.name) {
          updateData.name = data.name
        }
        if (data.role && data.role !== existing.role) {
          updateData.role = data.role
          updateData.permissions = JSON.stringify(getPermissionsForRole(data.role))
        }
        if (typeof data.isActive === 'boolean' && data.isActive !== existing.isActive) {
          updateData.isActive = data.isActive
        }
        if (hashedPassword) {
          updateData.password = hashedPassword
        }

        const resultingRole = data.role ?? existing.role
        const resultingIsActive = data.isActive ?? existing.isActive
        const existingStoreIds = existing.storeAssignments.map((assignment) => assignment.storeId)
        const resultingStoreIds =
          resultingRole === 'super_admin' ? [] : (data.storeIds ?? existingStoreIds)

        if (resultingRole !== 'super_admin' && resultingStoreIds.length === 0) {
          return { status: 'store_required' as const }
        }

        if (resultingRole !== 'super_admin') {
          const validStoreCount = await transaction.store.count({
            where: { id: { in: resultingStoreIds }, isActive: true },
          })
          if (validStoreCount !== resultingStoreIds.length) {
            return { status: 'invalid_store' as const }
          }
        }

        const removesActiveSuperAdmin =
          existing.role === 'super_admin' &&
          existing.isActive &&
          (resultingRole !== 'super_admin' || !resultingIsActive)
        if (removesActiveSuperAdmin) {
          const otherActiveSuperAdmins = await transaction.admin.count({
            where: {
              id: { not: data.id },
              role: 'super_admin',
              isActive: true,
            },
          })
          if (otherActiveSuperAdmins === 0) {
            return { status: 'last_super_admin' as const }
          }
        }

        const sortedExistingStoreIds = [...existingStoreIds].sort()
        const sortedResultingStoreIds = [...resultingStoreIds].sort()
        const storeAssignmentsChanged =
          sortedExistingStoreIds.length !== sortedResultingStoreIds.length ||
          sortedExistingStoreIds.some(
            (storeId, index) => storeId !== sortedResultingStoreIds[index]
          )

        if (
          storeAssignmentsChanged ||
          (data.role === 'super_admin' && existingStoreIds.length > 0)
        ) {
          updateData.storeAssignments = {
            deleteMany: {},
            create: sortedResultingStoreIds.map((storeId) => ({ storeId })),
          }
        }

        if (Object.keys(updateData).length === 0) {
          return { status: 'unchanged' as const }
        }

        const admin = await transaction.admin.update({
          where: { id: data.id },
          data: updateData,
          include: storeAssignmentInclude,
        })

        return { status: 'updated' as const, admin }
      },
      { isolationLevel: 'Serializable' }
    )

    if (result.status === 'not_found') {
      return NextResponse.json({ error: '管理者が見つかりません' }, { status: 404 })
    }
    if (result.status === 'store_required') {
      return NextResponse.json({ error: '店舗を1つ以上選択してください' }, { status: 400 })
    }
    if (result.status === 'invalid_store') {
      return NextResponse.json({ error: '無効な店舗が含まれています' }, { status: 400 })
    }
    if (result.status === 'last_super_admin') {
      return NextResponse.json(
        { error: '少なくとも1名のスーパー管理者が必要です' },
        { status: 400 }
      )
    }
    if (result.status === 'unchanged') {
      return NextResponse.json({ error: '変更内容がありません' }, { status: 400 })
    }

    return NextResponse.json({ admin: serializeAdmin(result.admin) })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: '入力内容に不備があります', details: err.issues },
        { status: 400 }
      )
    }
    if ((err as any)?.code === 'P2002') {
      return NextResponse.json(
        { error: 'このメールアドレスは既に使用されています' },
        { status: 409 }
      )
    }
    if (isTransactionConflict(err)) {
      return NextResponse.json(
        { error: '管理者情報が同時に更新されました。再読み込みしてやり直してください' },
        { status: 409 }
      )
    }
    logAdminMutationFailure('update', err)
    return NextResponse.json({ error: '管理者の更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { session, error } = await getAdminSession()
  if (!session) return error!

  const authError = ensureSuperAdmin(session)
  if (authError) return authError

  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: '管理者IDが必要です' }, { status: 400 })
    }

    if (session.user.id === id) {
      return NextResponse.json({ error: '自身のアカウントは停止できません' }, { status: 400 })
    }

    const result = await db.$transaction(
      async (transaction) => {
        const target = await transaction.admin.findUnique({ where: { id } })
        if (!target) return { status: 'not_found' as const }
        if (!target.isActive) return { status: 'already_inactive' as const }

        if (target.role === 'super_admin') {
          const otherActiveSuperAdmins = await transaction.admin.count({
            where: {
              id: { not: id },
              role: 'super_admin',
              isActive: true,
            },
          })
          if (otherActiveSuperAdmins === 0) {
            return { status: 'last_super_admin' as const }
          }
        }

        await transaction.admin.update({
          where: { id },
          data: { isActive: false },
        })
        return { status: 'deactivated' as const }
      },
      { isolationLevel: 'Serializable' }
    )

    if (result.status === 'not_found') {
      return NextResponse.json({ error: '管理者が見つかりません' }, { status: 404 })
    }
    if (result.status === 'already_inactive') {
      return NextResponse.json({ success: true, deactivated: false })
    }
    if (result.status === 'last_super_admin') {
      return NextResponse.json(
        { error: '少なくとも1名のスーパー管理者が必要です' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, deactivated: true })
  } catch (err) {
    if (isTransactionConflict(err)) {
      return NextResponse.json(
        { error: '管理者情報が同時に更新されました。再読み込みしてやり直してください' },
        { status: 409 }
      )
    }
    logAdminMutationFailure('deactivate', err)
    return NextResponse.json({ error: '管理者の停止に失敗しました' }, { status: 500 })
  }
}

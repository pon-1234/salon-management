/**
 * @design_doc   Admin management API endpoints
 * @related_to   Admin management settings page, Admin model (Prisma)
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

const roleEnum = z.enum(['super_admin', 'manager', 'staff'])

const ROLE_PERMISSIONS: Record<z.infer<typeof roleEnum>, string[]> = {
  super_admin: ['*'],
  manager: ['cast:*', 'customer:read', 'reservation:*', 'analytics:read', 'dashboard:view'],
  staff: ['cast:read', 'customer:read', 'reservation:read'],
}

function getPermissionsForRole(role: z.infer<typeof roleEnum>) {
  return ROLE_PERMISSIONS[role] ?? []
}

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
  role: roleEnum.default('staff'),
  isActive: z.boolean().optional(),
})

const updateSchema = z
  .object({
    id: z.string().min(1),
    email: z.string().email().optional(),
    name: z.string().min(1).optional(),
    password: z.string().min(8).optional(),
    role: roleEnum.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 1, {
    message: '更新内容がありません',
    path: ['id'],
  })

function serializeAdmin(admin: any) {
  let permissions: string[] = []
  if (admin.permissions) {
    try {
      const parsed = typeof admin.permissions === 'string' ? admin.permissions : JSON.stringify(admin.permissions)
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

export async function GET() {
  const { session, error } = await getAdminSession()
  if (!session) return error!

  const admins = await db.admin.findMany({
    orderBy: { createdAt: 'desc' },
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

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS)

    const admin = await db.admin.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: data.role,
        permissions: JSON.stringify(getPermissionsForRole(data.role)),
        isActive: data.isActive ?? true,
      },
    })

    return NextResponse.json({ admin: serializeAdmin(admin) }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: '入力内容に不備があります', details: err.issues }, { status: 400 })
    }

    if ((err as any)?.code === 'P2002') {
      return NextResponse.json({ error: 'このメールアドレスは既に登録されています' }, { status: 409 })
    }

    console.error('Failed to create admin:', err)
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

    const existing = await db.admin.findUnique({ where: { id: data.id } })
    if (!existing) {
      return NextResponse.json({ error: '管理者が見つかりません' }, { status: 404 })
    }

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

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, SALT_ROUNDS)
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: '変更内容がありません' }, { status: 400 })
    }

    const admin = await db.admin.update({
      where: { id: data.id },
      data: updateData,
    })

    return NextResponse.json({ admin: serializeAdmin(admin) })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: '入力内容に不備があります', details: err.issues }, { status: 400 })
    }
    if ((err as any)?.code === 'P2002') {
      return NextResponse.json({ error: 'このメールアドレスは既に使用されています' }, { status: 409 })
    }
    console.error('Failed to update admin:', err)
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
      return NextResponse.json({ error: '自身のアカウントは削除できません' }, { status: 400 })
    }

    const target = await db.admin.findUnique({ where: { id } })
    if (!target) {
      return NextResponse.json({ error: '管理者が見つかりません' }, { status: 404 })
    }

    const remainingSuperAdmins = await db.admin.count({
      where: {
        id: { not: id },
        role: 'super_admin',
        isActive: true,
      },
    })

    if (target.role === 'super_admin' && remainingSuperAdmins === 0) {
      return NextResponse.json(
        { error: '少なくとも1名のスーパー管理者が必要です' },
        { status: 400 }
      )
    }

    await db.admin.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Failed to delete admin:', err)
    return NextResponse.json({ error: '管理者の削除に失敗しました' }, { status: 500 })
  }
}

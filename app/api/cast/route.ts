/**
 * @design_doc   Cast API endpoints for CRUD operations
 * @related_to   CastRepository, Cast type, Prisma Cast model
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import logger from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (id) {
      const cast = await db.cast.findUnique({
        where: { id },
        include: {
          schedules: true,
          reservations: {
            include: {
              customer: true,
              course: true,
              options: {
                include: {
                  option: true,
                },
              },
            },
          },
        },
      })

      if (!cast) {
        return NextResponse.json({ error: 'Cast not found' }, { status: 404 })
      }

      return NextResponse.json(cast)
    }

    const casts = await db.cast.findMany({
      include: {
        schedules: true,
        reservations: {
          include: {
            customer: true,
            course: true,
          },
        },
      },
    })

    return NextResponse.json(casts)
  } catch (error) {
    logger.error({ err: error }, 'Error fetching cast data')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // キャストの作成は管理者のみ可能
  // TODO: 管理者ロールのチェックを実装
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function PUT(request: NextRequest) {
  // キャストの更新は管理者のみ可能
  // TODO: 管理者ロールのチェックを実装
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function DELETE(request: NextRequest) {
  // キャストの削除は管理者のみ可能
  // TODO: 管理者ロールのチェックを実装
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

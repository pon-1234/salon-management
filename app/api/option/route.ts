/**
 * @design_doc   Option pricing API endpoints for CRUD operations
 * @related_to   PricingRepository, Option type, Prisma OptionPrice model
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import logger from '@/lib/logger'

async function requireSession() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  return session
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    if (session instanceof NextResponse) {
      return session
    }

    const isAdmin = session.user.role === 'admin'
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (id) {
      const option = await db.optionPrice.findUnique({
        where: { id },
        include: {
          reservations: {
            include: {
              reservation: {
                include: {
                  customer: true,
                  cast: true,
                },
              },
            },
          },
        },
      })

      if (!option) {
        return NextResponse.json({ error: 'Option not found' }, { status: 404 })
      }

      if (isAdmin) {
        return NextResponse.json(option)
      }

      const { reservations, ...optionData } = option as typeof option & {
        reservations?: unknown
      }

      return NextResponse.json(optionData)
    }

    const options = await db.optionPrice.findMany({
      include: {
        reservations: {
          include: {
            reservation: {
              include: {
                customer: true,
                cast: true,
              },
            },
          },
        },
      },
      orderBy: {
        price: 'asc',
      },
    })

    if (isAdmin) {
      return NextResponse.json(options)
    }

    const sanitizedOptions = options.map((option) => {
      const { reservations, ...optionData } = option as typeof option & {
        reservations?: unknown
      }
      return optionData
    })

    return NextResponse.json(sanitizedOptions)
  } catch (error) {
    logger.error({ err: error }, 'Error fetching option data')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    if (session instanceof NextResponse) {
      return session
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const data = await request.json()

    const newOption = await db.optionPrice.create({
      data: {
        name: data.name,
        price: data.price,
        storeShare: data.storeShare ?? null,
        castShare: data.castShare ?? null,
      },
      include: {
        reservations: true,
      },
    })

    return NextResponse.json(newOption, { status: 201 })
  } catch (error) {
    logger.error({ err: error }, 'Error creating option')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSession()
    if (session instanceof NextResponse) {
      return session
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const data = await request.json()
    const { id, ...updates } = data

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const updatedOption = await db.optionPrice.update({
      where: { id },
      data: {
        name: updates.name,
        price: updates.price,
        storeShare: updates.storeShare ?? null,
        castShare: updates.castShare ?? null,
      },
      include: {
        reservations: {
          include: {
            reservation: {
              include: {
                customer: true,
                cast: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(updatedOption)
  } catch (error: any) {
    logger.error({ err: error }, 'Error updating option')
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Option not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireSession()
    if (session instanceof NextResponse) {
      return session
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    await db.optionPrice.delete({
      where: { id },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    logger.error({ err: error }, 'Error deleting option')
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Option not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

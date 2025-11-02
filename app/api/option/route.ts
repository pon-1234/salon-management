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
import { defaultOptions } from '@/lib/pricing/data'
import { resolveStoreId, ensureStoreId } from '@/lib/store/server'

function normalizeNumber(value: any, fallback: number | null = null): number | null {
  if (value === null || value === undefined || value === '') return fallback
  const num = Number(value)
  if (!Number.isFinite(num)) {
    return fallback
  }
  return Math.trunc(num)
}

function buildOptionPayload(data: any, mode: 'create' | 'update' = 'create') {
  const payload: Record<string, any> = {}

  if (data.name !== undefined) {
    const name = data.name?.toString().trim()
    if (!name) {
      throw new Error('NAME_REQUIRED')
    }
    payload.name = name
  } else if (mode === 'create') {
    throw new Error('NAME_REQUIRED')
  }

  if (data.description !== undefined) {
    payload.description = data.description ? data.description.toString() : null
  } else if (mode === 'create') {
    payload.description = null
  }

  if (data.price !== undefined) {
    payload.price = Math.max(0, normalizeNumber(data.price, 0) ?? 0)
  } else if (mode === 'create') {
    payload.price = 0
  }

  if (data.duration !== undefined) {
    payload.duration = normalizeNumber(data.duration)
  }

  if (data.category !== undefined) {
    const category = data.category?.toString() || 'special'
    payload.category = category
  } else if (mode === 'create') {
    payload.category = 'special'
  }

  if (data.displayOrder !== undefined) {
    payload.displayOrder = normalizeNumber(data.displayOrder, 0) ?? 0
  } else if (mode === 'create') {
    payload.displayOrder = 0
  }

  if (data.isActive !== undefined) {
    payload.isActive = Boolean(data.isActive)
  } else if (mode === 'create') {
    payload.isActive = true
  }

  if (data.note !== undefined) {
    payload.note = data.note ? data.note.toString() : null
  }

  if (data.storeShare !== undefined) {
    payload.storeShare = Math.max(0, normalizeNumber(data.storeShare, 0) ?? 0)
  }

  if (data.castShare !== undefined) {
    payload.castShare = Math.max(0, normalizeNumber(data.castShare, 0) ?? 0)
  }

  return payload
}

async function requireSession() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  return session
}

function buildFallbackOptionResponse(id: string | null, isAdmin: boolean) {
  if (id) {
    const option = defaultOptions.find((item) => item.id === id)
    if (!option) {
      return NextResponse.json({ error: 'Option not found' }, { status: 404 })
    }
    const payload = isAdmin ? { ...option, reservations: [] } : option
    return NextResponse.json(payload)
  }

  const payload = defaultOptions.map((option) =>
    isAdmin ? { ...option, reservations: [] } : option
  )
  return NextResponse.json(payload)
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')
  const storeId = await ensureStoreId(await resolveStoreId(request))
  let isAdmin = false

  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.role === 'admin') {
      isAdmin = true
    }

    if (id) {
      const option = await db.optionPrice.findFirst({
        where: { id, storeId },
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
      where: {
        storeId,
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
      orderBy: [
        {
          displayOrder: 'asc',
        },
        {
          price: 'asc',
        },
      ],
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
    return buildFallbackOptionResponse(id, isAdmin)
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
    const storeId = await ensureStoreId(await resolveStoreId(request))

    let payload
    try {
      payload = buildOptionPayload(data, 'create')
    } catch (error) {
      if (error instanceof Error && error.message === 'NAME_REQUIRED') {
        return NextResponse.json(
          {
            error: 'Validation error',
            details: [{ path: ['name'], message: 'Name is required' }],
          },
          { status: 400 }
        )
      }
      throw error
    }

    const prismaPayload = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined)
    )

    const newOption = await db.optionPrice.create({
      data: {
        ...prismaPayload,
        storeId,
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
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const { id, ...updates } = data

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    let payload
    try {
      payload = buildOptionPayload(updates, 'update')
    } catch (error) {
      if (error instanceof Error && error.message === 'NAME_REQUIRED') {
        return NextResponse.json(
          {
            error: 'Validation error',
            details: [{ path: ['name'], message: 'Name is required' }],
          },
          { status: 400 }
        )
      }
      throw error
    }

    const sanitizedPayload = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined)
    )

    const existingOption = await db.optionPrice.findFirst({
      where: { id, storeId },
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

    if (!existingOption) {
      return NextResponse.json({ error: 'Option not found' }, { status: 404 })
    }

    const updateKeys = Object.keys(sanitizedPayload)
    const isStatusOnlyUpdate = updateKeys.length === 1 && updateKeys[0] === 'isActive'

    if (isStatusOnlyUpdate) {
      const updatedOption = await db.optionPrice.update({
        where: { id },
        data: {
          isActive: sanitizedPayload.isActive,
          archivedAt: sanitizedPayload.isActive ? null : new Date(),
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
    }

    const updatedOption = await db.$transaction(async (tx) => {
      await tx.optionPrice.update({
        where: { id },
        data: {
          isActive: false,
          archivedAt: new Date(),
        },
      })

      const baseOptionData = {
        name: existingOption.name,
        description: existingOption.description,
        price: existingOption.price,
        duration: existingOption.duration,
        category: existingOption.category,
        displayOrder: existingOption.displayOrder,
        note: existingOption.note,
        storeShare: existingOption.storeShare,
        castShare: existingOption.castShare,
        storeId: existingOption.storeId,
      }

      return tx.optionPrice.create({
        data: {
          ...baseOptionData,
          ...sanitizedPayload,
          isActive: sanitizedPayload.isActive ?? true,
          archivedAt: null,
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
    const storeId = await ensureStoreId(await resolveStoreId(request))

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const existingOption = await db.optionPrice.findFirst({
      where: { id, storeId },
    })

    if (!existingOption) {
      return NextResponse.json({ error: 'Option not found' }, { status: 404 })
    }

    await db.optionPrice.update({
      where: { id },
      data: {
        isActive: false,
        archivedAt: new Date(),
      },
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

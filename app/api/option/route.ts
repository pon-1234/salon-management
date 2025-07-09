/**
 * @design_doc   Option pricing API endpoints for CRUD operations
 * @related_to   PricingRepository, Option type, Prisma OptionPrice model
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

      return NextResponse.json(option)
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

    return NextResponse.json(options)
  } catch (error) {
    logger.error({ err: error }, 'Error fetching option data')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const newOption = await db.optionPrice.create({
      data: {
        name: data.name,
        price: data.price,
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

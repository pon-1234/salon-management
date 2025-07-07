/**
 * @design_doc   Customer API endpoints for CRUD operations
 * @related_to   CustomerRepository, Customer type, Prisma Customer model
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (id) {
      const customer = await db.customer.findUnique({
        where: { id },
        include: {
          ngCasts: {
            include: {
              cast: true,
            },
          },
          reservations: {
            include: {
              cast: true,
              course: true,
              options: {
                include: {
                  option: true,
                },
              },
            },
          },
          reviews: {
            include: {
              cast: true,
            },
          },
        },
      })

      if (!customer) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
      }

      return NextResponse.json(customer)
    }

    const customers = await db.customer.findMany({
      include: {
        ngCasts: {
          include: {
            cast: true,
          },
        },
        reservations: {
          include: {
            cast: true,
            course: true,
          },
        },
        reviews: {
          include: {
            cast: true,
          },
        },
      },
    })

    return NextResponse.json(customers)
  } catch (error) {
    console.error('Error fetching customer data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const newCustomer = await db.customer.create({
      data: {
        name: data.name,
        nameKana: data.nameKana,
        phone: data.phone,
        email: data.email,
        password: data.password, // In a real app, this should be hashed
        birthDate: new Date(data.birthDate),
        memberType: data.memberType || 'regular',
        points: data.points || 0,
      },
      include: {
        ngCasts: {
          include: {
            cast: true,
          },
        },
        reservations: {
          include: {
            cast: true,
            course: true,
          },
        },
        reviews: {
          include: {
            cast: true,
          },
        },
      },
    })

    return NextResponse.json(newCustomer, { status: 201 })
  } catch (error) {
    console.error('Error creating customer:', error)
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

    const updatedCustomer = await db.customer.update({
      where: { id },
      data: {
        name: updates.name,
        nameKana: updates.nameKana,
        phone: updates.phone,
        email: updates.email,
        birthDate: updates.birthDate ? new Date(updates.birthDate) : undefined,
        memberType: updates.memberType,
        points: updates.points,
      },
      include: {
        ngCasts: {
          include: {
            cast: true,
          },
        },
        reservations: {
          include: {
            cast: true,
            course: true,
          },
        },
        reviews: {
          include: {
            cast: true,
          },
        },
      },
    })

    return NextResponse.json(updatedCustomer)
  } catch (error) {
    console.error('Error updating customer:', error)
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
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

    await db.customer.delete({
      where: { id },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting customer:', error)
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

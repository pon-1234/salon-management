/**
 * @design_doc   Customer API endpoints for CRUD operations
 * @related_to   CustomerRepository, Customer type, Prisma Customer model
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import logger from '@/lib/logger'

const SALT_ROUNDS = 10

export async function GET(request: NextRequest) {
  try {
    const authCustomerId = request.headers.get('x-customer-id')
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (id) {
      if (!authCustomerId || id !== authCustomerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

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

      const { password, ...customerData } = customer
      return NextResponse.json(customerData)
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } catch (error) {
    logger.error({ err: error }, 'Error fetching customer data')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    if (!data.password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS)

    const newCustomer = await db.customer.create({
      data: {
        name: data.name,
        nameKana: data.nameKana,
        phone: data.phone,
        email: data.email,
        password: hashedPassword,
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

    const { password: _, ...customerData } = newCustomer
    return NextResponse.json(customerData, { status: 201 })
  } catch (error: any) {
    logger.error({ err: error }, 'Error creating customer')
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Email or phone already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authCustomerId = request.headers.get('x-customer-id')
    const data = await request.json()
    const { id, password, ...updates } = data

    if (!authCustomerId || id !== authCustomerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (password) {
      updates.password = await bcrypt.hash(password, SALT_ROUNDS)
    }

    const updatedCustomer = await db.customer.update({
      where: { id },
      data: {
        ...updates,
        birthDate: updates.birthDate ? new Date(updates.birthDate) : undefined,
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

    const { password: _, ...customerData } = updatedCustomer
    return NextResponse.json(customerData)
  } catch (error: any) {
    logger.error({ err: error }, 'Error updating customer')
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

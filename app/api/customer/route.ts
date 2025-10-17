/**
 * @design_doc   Customer API endpoints for CRUD operations
 * @related_to   CustomerRepository, Customer type, Prisma Customer model
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import logger from '@/lib/logger'
import { customers as mockCustomers } from '@/lib/customer/data'
import { normalizePhoneQuery } from '@/lib/customer/utils'
import { env } from '@/lib/config/env'

const SALT_ROUNDS = 10

function sanitizeCustomer(customer: any) {
  const {
    password,
    resetToken,
    resetTokenExpiry,
    emailVerificationToken,
    emailVerificationExpiry,
    ...safe
  } = customer
  return safe
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')
  const phoneQuery = searchParams.get('phone')
  const limitParam = searchParams.get('limit')
  const take = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 10, 1), 50) : 10

  const session = await getServerSession(authOptions)
  const isAdmin = session?.user?.role === 'admin'
  const sessionCustomerId = session?.user?.id

  try {
    if (id) {
      if (!session) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }

      // Allow admin or the customer themselves
      if (!isAdmin && id !== sessionCustomerId) {
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

    if (phoneQuery) {
      if (!session) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const normalizedPhone = phoneQuery.replace(/\D/g, '')
      if (!normalizedPhone) {
        return NextResponse.json([])
      }

      const customers = await db.customer.findMany({
        where: {
          phone: {
            contains: normalizedPhone,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take,
        select: {
          id: true,
          name: true,
          nameKana: true,
          phone: true,
          email: true,
          birthDate: true,
          memberType: true,
          points: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      return NextResponse.json(customers.map(sanitizeCustomer))
    }

    // Get all customers - admin only
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const customers = await db.customer.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        nameKana: true,
        phone: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(customers)
  } catch (error) {
    logger.error({ err: error }, 'Error fetching customer data')
    if (!env.featureFlags.useMockFallbacks) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    if (id) {
      if (!session) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      if (!isAdmin && id !== sessionCustomerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const fallback = mockCustomers.find((customer) => customer.id === id)
      if (!fallback) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
      }

      return NextResponse.json(sanitizeCustomer(fallback))
    }

    if (phoneQuery) {
      if (!session) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const normalizedPhone = normalizePhoneQuery(phoneQuery)
      if (!normalizedPhone) {
        return NextResponse.json([])
      }
      const matches = mockCustomers.filter((customer) =>
        normalizePhoneQuery(customer.phone).includes(normalizedPhone)
      )
      return NextResponse.json(matches.slice(0, take).map(sanitizeCustomer))
    }

    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(mockCustomers.map(sanitizeCustomer))
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
    const session = await getServerSession(authOptions)
    const data = await request.json()
    const { id, password, ...updates } = data

    const isAdmin = session?.user?.role === 'admin'
    const sessionCustomerId = session?.user?.id

    // Allow admin or the customer themselves
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (!isAdmin && id !== sessionCustomerId) {
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

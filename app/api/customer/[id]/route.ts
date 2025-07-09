import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import logger from '@/lib/logger'

interface Params {
  id: string
}

// GET a single customer by ID
export async function GET(request: Request, context: { params: Promise<Params> }) {
  try {
    const { id } = await context.params
    const customer = await db.customer.findUnique({
      where: { id },
    })
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }
    return NextResponse.json(customer)
  } catch (error) {
    logger.error({ err: error, customerId: (await context.params).id }, 'Failed to fetch customer')
    return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 })
  }
}

// UPDATE a customer
export async function PUT(request: Request, context: { params: Promise<Params> }) {
  try {
    const { id } = await context.params
    const data = await request.json()
    const updatedCustomer = await db.customer.update({
      where: { id },
      data: {
        ...data,
        // Ensure date fields are correctly formatted if provided
        ...(data.birthDate && { birthDate: new Date(data.birthDate) }),
      },
    })
    return NextResponse.json(updatedCustomer)
  } catch (error) {
    logger.error({ err: error, customerId: (await context.params).id }, 'Failed to update customer')
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 })
  }
}

// DELETE a customer
export async function DELETE(request: Request, context: { params: Promise<Params> }) {
  try {
    const { id } = await context.params
    await db.customer.delete({
      where: { id },
    })
    return new NextResponse(null, { status: 204 }) // No Content
  } catch (error) {
    logger.error({ err: error, customerId: (await context.params).id }, 'Failed to delete customer')
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 })
  }
}

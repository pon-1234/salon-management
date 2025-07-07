import { NextResponse } from 'next/server'
import { PrismaClient } from '@/lib/generated/prisma'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const customers = await prisma.customer.findMany()
    return NextResponse.json(customers)
  } catch (error) {
    console.error('Failed to fetch customers:', error)
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    // TODO: Add validation logic here (e.g., with Zod)
    const newCustomer = await prisma.customer.create({
      data: {
        name: data.name,
        nameKana: data.nameKana,
        phone: data.phone,
        email: data.email,
        password: data.password, // In a real app, this should be hashed
        birthDate: new Date(data.birthDate),
        memberType: data.memberType,
        points: data.points,
      },
    })
    return NextResponse.json(newCustomer, { status: 201 })
  } catch (error) {
    console.error('Failed to create customer:', error)
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
  }
}

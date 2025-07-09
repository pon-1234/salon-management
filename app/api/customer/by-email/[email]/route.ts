/**
 * @design_doc   Customer lookup by email API route
 * @related_to   Customer repository, authentication
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/lib/generated/prisma'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const { email } = await params
    const decodedEmail = decodeURIComponent(email)
    
    const customer = await prisma.customer.findUnique({
      where: { email: decodedEmail }
    })
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }
    
    return NextResponse.json(customer)
  } catch (error) {
    console.error('Failed to fetch customer by email:', error)
    return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 })
  }
}
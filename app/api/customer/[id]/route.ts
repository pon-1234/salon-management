import { NextResponse } from 'next/server';
import { PrismaClient } from '@/lib/generated/prisma';

const prisma = new PrismaClient();

interface Params {
  id: string;
}

// GET a single customer by ID
export async function GET(request: Request, context: { params: Params }) {
  try {
    const { id } = context.params;
    const customer = await prisma.customer.findUnique({
      where: { id },
    });
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    return NextResponse.json(customer);
  } catch (error) {
    console.error('Failed to fetch customer:', error);
    return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 });
  }
}

// UPDATE a customer
export async function PUT(request: Request, context: { params: Params }) {
  try {
    const { id } = context.params;
    const data = await request.json();
    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        ...data,
        // Ensure date fields are correctly formatted if provided
        ...(data.birthDate && { birthDate: new Date(data.birthDate) }),
      },
    });
    return NextResponse.json(updatedCustomer);
  } catch (error) {
    console.error('Failed to update customer:', error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}

// DELETE a customer
export async function DELETE(request: Request, context: { params: Params }) {
  try {
    const { id } = context.params;
    await prisma.customer.delete({
      where: { id },
    });
    return new NextResponse(null, { status: 204 }); // No Content
  } catch (error) {
    console.error('Failed to delete customer:', error);
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
  }
} 
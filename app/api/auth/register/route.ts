/**
 * @design_doc   Customer registration API route
 * @related_to   NextAuth.js configuration, customer authentication
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { CustomerRepositoryImpl } from '@/lib/customer/repository-impl'

const customerRepository = new CustomerRepositoryImpl()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nickname, email, phone, password, birthDate, smsNotifications, storeId } = body

    // Validate required fields
    if (!nickname || !email || !phone || !password || !storeId) {
      return NextResponse.json(
        { error: '必須項目が入力されていません' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingCustomer = await customerRepository.findByEmail(email)
    if (existingCustomer) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に使用されています' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await hash(password, 12)

    // Create customer
    const customer = await customerRepository.create({
      name: nickname, // Map nickname to name field
      email,
      phone,
      password: hashedPassword,
      birthDate: birthDate ? new Date(birthDate) : new Date(),
      age: birthDate ? new Date().getFullYear() - new Date(birthDate).getFullYear() : 0,
      memberType: 'regular' as const,
      smsEnabled: smsNotifications || false,
      points: 1000, // Initial signup bonus
      registrationDate: new Date(),
    })

    // Remove password from response
    const { password: _, ...customerWithoutPassword } = customer

    return NextResponse.json(
      { 
        message: '会員登録が完了しました',
        customer: customerWithoutPassword 
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: '登録中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
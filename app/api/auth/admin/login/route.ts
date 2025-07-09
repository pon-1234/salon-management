/**
 * @design_doc   Admin login API endpoint with role-based authentication
 * @related_to   Admin model, JWT authentication, middleware.ts
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const admin = await db.admin.findUnique({
      where: { email },
    })

    if (!admin) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password)

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Check if account is active
    if (!admin.isActive) {
      return NextResponse.json({ error: 'Account is not active' }, { status: 403 })
    }

    // Get JWT secret
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      console.error('JWT_SECRET is not defined in environment variables')
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    // Parse permissions if stored as JSON string
    let permissions = []
    if (admin.permissions) {
      try {
        permissions = JSON.parse(admin.permissions as string)
      } catch {
        permissions = []
      }
    }

    // Generate JWT with admin-specific payload
    const token = jwt.sign(
      {
        adminId: admin.id,
        role: 'admin',
        permissions,
      },
      jwtSecret,
      { expiresIn: '8h' } // Longer expiration for admin sessions
    )

    // Update last login timestamp
    await db.admin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    })

    // Create response with token in cookie
    const response = NextResponse.json({
      message: 'Login successful',
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    })

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 hours
    })

    return response
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
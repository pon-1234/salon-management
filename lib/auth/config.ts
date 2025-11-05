/**
 * @design_doc   NextAuth.js configuration
 * @related_to   middleware.ts, authentication API routes
 * @known_issues None currently
 */
import type { NextAuthOptions, User } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { checkRateLimit, recordLoginAttempt } from './rate-limit'
import { env } from '@/lib/config/env'
import { shouldUseMockFallbacks } from '@/lib/config/feature-flags'
import { customers as fallbackCustomers } from '@/lib/customer/data'

// Extend the default session interface
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: 'admin' | 'customer' | 'cast'
      adminRole?: string
      permissions?: string[]
      storeId?: string
      image?: string | null
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: 'admin' | 'customer' | 'cast'
    adminRole?: string
    permissions?: string[]
    storeId?: string
    image?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: 'admin' | 'customer' | 'cast'
    adminRole?: string
    permissions?: string[]
    storeId?: string
    image?: string | null
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'admin-credentials',
      name: 'Admin Login',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'admin@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Check rate limiting
        const rateLimitResult = checkRateLimit(`admin:${credentials.email}`)
        if (!rateLimitResult.allowed) {
          throw new Error(
            `Too many login attempts. Please try again in ${rateLimitResult.retryAfter} seconds.`
          )
        }

        try {
          const admin = await db.admin.findUnique({
            where: { email: credentials.email },
          })

          if (!admin) {
            recordLoginAttempt(`admin:${credentials.email}`, false)
            return null
          }

          // Check if account is active
          if (!admin.isActive) {
            recordLoginAttempt(`admin:${credentials.email}`, false)
            throw new Error('Account is not active. Please contact administrator.')
          }

          // Compare password with bcrypt
          const isPasswordValid = await bcrypt.compare(credentials.password, admin.password)

          if (!isPasswordValid) {
            recordLoginAttempt(`admin:${credentials.email}`, false)
            return null
          }

          // Parse permissions if stored as JSON string
          let permissions: string[] = []
          if (admin.permissions) {
            try {
              permissions = JSON.parse(admin.permissions as string)
            } catch {
              permissions = []
            }
          }

          // Update last login timestamp
          await db.admin.update({
            where: { id: admin.id },
            data: { lastLogin: new Date() },
          })

          // Success - clear rate limit
          recordLoginAttempt(`admin:${credentials.email}`, true)

          return {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: 'admin',
            adminRole: admin.role,
            permissions,
          } as User
        } catch (error) {
          console.error('Error during admin authentication:', error)
          recordLoginAttempt(`admin:${credentials.email}`, false)
          return null
        }
      },
    }),
    CredentialsProvider({
      id: 'customer-credentials',
      name: 'Customer Login',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'customer@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Check rate limiting
        const rateLimitResult = checkRateLimit(`customer:${credentials.email}`)
        if (!rateLimitResult.allowed) {
          throw new Error(
            `Too many login attempts. Please try again in ${rateLimitResult.retryAfter} seconds.`
          )
        }

        const normalizedEmail = credentials.email.trim().toLowerCase()

        let customer: typeof db.customer.$inferFindUnique | null = null
        try {
          customer = await db.customer.findUnique({
            where: { email: normalizedEmail },
          })
        } catch (error) {
          console.warn('Customer lookup failed, falling back to mock data:', error)
        }

        if (customer) {
          try {
            const isPasswordValid = await bcrypt.compare(credentials.password, customer.password)

            if (!isPasswordValid) {
              recordLoginAttempt(`customer:${credentials.email}`, false)
              return null
            }

            recordLoginAttempt(`customer:${credentials.email}`, false)
            recordLoginAttempt(`customer:${credentials.email}`, true)

            return {
              id: customer.id,
              email: customer.email,
              name: customer.name || 'Customer',
              role: 'customer',
            } as User
          } catch (error) {
            console.error('Error during password verification:', error)
            recordLoginAttempt(`customer:${credentials.email}`, false)
            return null
          }
        }

        if (shouldUseMockFallbacks()) {
          const fallback = fallbackCustomers.find(
            (entry) => entry.email?.toLowerCase() === normalizedEmail
          )

          if (!fallback && normalizedEmail === 'tanaka@example.com') {
            // Provide a fallback mock if demo user not seeded
            fallbackCustomers.push({
              id: 'demo-tanaka',
              name: '田中 太郎',
              nameKana: 'タナカ タロウ',
              phone: '08012345678',
              email: 'tanaka@example.com',
              password: 'password123',
              birthDate: new Date(1992, 4, 12),
              age: 32,
              memberType: 'vip',
              smsEnabled: true,
              points: 0,
              registrationDate: new Date(),
              lastVisitDate: new Date(),
              notes: 'Auto-provisioned demo customer',
              createdAt: new Date(),
              updatedAt: new Date(),
            } as any)
          }

          const effectiveFallback = fallbackCustomers.find(
            (entry) => entry.email?.toLowerCase() === normalizedEmail
          )

          if (effectiveFallback && effectiveFallback.password === credentials.password) {
            recordLoginAttempt(`customer:${credentials.email}`, true)

            return {
              id: effectiveFallback.id ?? `mock-${normalizedEmail}`,
              email: effectiveFallback.email,
              name: effectiveFallback.name || 'Customer',
              role: 'customer',
            } as User
          }
        }

        recordLoginAttempt(`customer:${credentials.email}`, false)
        return null
      },
    }),
    CredentialsProvider({
      id: 'cast-credentials',
      name: 'Cast Login',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'cast@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email.trim().toLowerCase()

        const rateLimitResult = checkRateLimit(`cast:${email}`)
        if (!rateLimitResult.allowed) {
          throw new Error(
            `Too many login attempts. Please try again in ${rateLimitResult.retryAfter} seconds.`
          )
        }

        try {
          const cast = await db.cast.findFirst({
            where: { loginEmail: email },
            include: {
              store: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          })

          if (!cast || !cast.passwordHash) {
            recordLoginAttempt(`cast:${email}`, false)
            return null
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, cast.passwordHash)
          if (!isPasswordValid) {
            recordLoginAttempt(`cast:${email}`, false)
            return null
          }

          recordLoginAttempt(`cast:${email}`, true)

          return {
            id: cast.id,
            email: cast.loginEmail ?? email,
            name: cast.name,
            role: 'cast',
            storeId: cast.storeId,
            image: Array.isArray(cast.images) && cast.images.length > 0 ? cast.images[0] : null,
          } as User
        } catch (error) {
          console.error('Error during cast authentication:', error)
          recordLoginAttempt(`cast:${email}`, false)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        if (user.adminRole) {
          token.adminRole = user.adminRole
        }
        if (user.permissions) {
          token.permissions = user.permissions
        }
        if (user.storeId) {
          token.storeId = user.storeId
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
        if (token.adminRole) {
          session.user.adminRole = token.adminRole
        }
        if (token.permissions) {
          session.user.permissions = token.permissions
        }
        if (token.storeId) {
          session.user.storeId = token.storeId
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 2 * 60 * 60, // 2 hours
    updateAge: 30 * 60, // Update session every 30 minutes
  },
  secret: env.nextAuth.secret,
}

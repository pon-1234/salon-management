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

// Extend the default session interface
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: 'admin' | 'customer'
    }
  }
  
  interface User {
    id: string
    email: string
    name: string
    role: 'admin' | 'customer'
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: 'admin' | 'customer'
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'admin-credentials',
      name: 'Admin Login',
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Check rate limiting
        const rateLimitResult = checkRateLimit(`admin:${credentials.email}`)
        if (!rateLimitResult.allowed) {
          throw new Error(`Too many login attempts. Please try again in ${rateLimitResult.retryAfter} seconds.`)
        }

        try {
          const admin = await db.admin.findUnique({
            where: { email: credentials.email }
          })

          if (!admin) {
            recordLoginAttempt(`admin:${credentials.email}`, false)
            return null
          }

          // Compare password with bcrypt
          const isPasswordValid = await bcrypt.compare(credentials.password, admin.password)

          if (!isPasswordValid) {
            recordLoginAttempt(`admin:${credentials.email}`, false)
            return null
          }

          // Success - clear rate limit
          recordLoginAttempt(`admin:${credentials.email}`, true)

          return {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: 'admin'
          } as User
        } catch (error) {
          console.error('Error during admin authentication:', error)
          recordLoginAttempt(`admin:${credentials.email}`, false)
          return null
        }
      }
    }),
    CredentialsProvider({
      id: 'customer-credentials',
      name: 'Customer Login',
      credentials: {
        email: { label: "Email", type: "email", placeholder: "customer@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Check rate limiting
        const rateLimitResult = checkRateLimit(`customer:${credentials.email}`)
        if (!rateLimitResult.allowed) {
          throw new Error(`Too many login attempts. Please try again in ${rateLimitResult.retryAfter} seconds.`)
        }

        try {
          const customer = await db.customer.findUnique({
            where: { email: credentials.email }
          })

          if (!customer) {
            recordLoginAttempt(`customer:${credentials.email}`, false)
            return null
          }

          // Compare password with bcrypt
          const isPasswordValid = await bcrypt.compare(credentials.password, customer.password)

          if (!isPasswordValid) {
            recordLoginAttempt(`customer:${credentials.email}`, false)
            return null
          }

          // Success - clear rate limit
          recordLoginAttempt(`customer:${credentials.email}`, true)

          return {
            id: customer.id,
            email: customer.email,
            name: customer.name || 'Customer',
            role: 'customer'
          } as User
        } catch (error) {
          console.error('Error during authentication:', error)
          recordLoginAttempt(`customer:${credentials.email}`, false)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    }
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
  secret: process.env.NEXTAUTH_SECRET || (() => {
    throw new Error('NEXTAUTH_SECRET is required in production')
  })(),
}
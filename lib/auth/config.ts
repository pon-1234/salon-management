/**
 * @design_doc   NextAuth.js configuration
 * @related_to   middleware.ts, authentication API routes
 * @known_issues None currently
 */
import type { NextAuthOptions, User } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaClient } from '@/lib/generated/prisma'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

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

        // Check if this is an admin user
        // In a real application, you would have an Admin table
        // For now, we'll use a hardcoded admin check
        if (credentials.email === 'admin@example.com' && credentials.password === 'admin123') {
          return {
            id: '1',
            email: credentials.email,
            name: 'Admin User',
            role: 'admin'
          } as User
        }

        return null
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

        try {
          const customer = await db.customer.findUnique({
            where: { email: credentials.email }
          })

          if (!customer) {
            return null
          }

          // Compare password with bcrypt
          const isPasswordValid = await bcrypt.compare(credentials.password, customer.password)

          if (!isPasswordValid) {
            return null
          }

          return {
            id: customer.id,
            email: customer.email,
            name: customer.name || 'Customer',
            role: 'customer'
          } as User
        } catch (error) {
          console.error('Error during authentication:', error)
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
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
}
/**
 * @design_doc   NextAuth.js API route handler
 * @related_to   authOptions in lib/auth/config.ts
 * @known_issues None currently
 */
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth/config'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
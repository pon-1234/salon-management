/**
 * @design_doc   Standardized error handling utilities for API routes
 * @related_to   All API routes
 * @known_issues None
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

/**
 * Standard error response interface
 */
interface ErrorResponse {
  error: string
  details?: any
  code?: string
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  message: string,
  status: number,
  details?: any,
  code?: string
): NextResponse<ErrorResponse> {
  const response: ErrorResponse = { error: message }
  if (details) response.details = details
  if (code) response.code = code

  return NextResponse.json(response, { status })
}

/**
 * Handles Zod validation errors
 */
export function handleValidationError(error: z.ZodError): NextResponse<ErrorResponse> {
  return createErrorResponse('バリデーションエラー', 400, error.errors, 'VALIDATION_ERROR')
}

/**
 * Handles Prisma database errors
 */
export function handlePrismaError(error: unknown): NextResponse<ErrorResponse> {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return createErrorResponse(
          'データが既に存在します',
          409,
          { field: error.meta?.target },
          'DUPLICATE_ENTRY'
        )
      case 'P2025':
        return createErrorResponse('データが見つかりません', 404, undefined, 'NOT_FOUND')
      case 'P2003':
        return createErrorResponse(
          '関連データが見つかりません',
          400,
          { field: error.meta?.field_name },
          'FOREIGN_KEY_ERROR'
        )
      default:
        console.error('Prisma error:', error)
        return createErrorResponse(
          'データベースエラーが発生しました',
          500,
          undefined,
          'DATABASE_ERROR'
        )
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    console.error('Prisma validation error:', error)
    return createErrorResponse(
      'データベースバリデーションエラー',
      400,
      undefined,
      'DATABASE_VALIDATION_ERROR'
    )
  }

  return createErrorResponse('予期しないエラーが発生しました', 500, undefined, 'INTERNAL_ERROR')
}

/**
 * Generic error handler for API routes
 */
export function handleApiError(error: unknown): NextResponse<ErrorResponse> {
  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    return handleValidationError(error)
  }

  // Handle Prisma errors
  if (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientValidationError
  ) {
    return handlePrismaError(error)
  }

  // Handle generic errors with message
  if (error instanceof Error) {
    console.error('API error:', error)
    return createErrorResponse(
      error.message || '予期しないエラーが発生しました',
      500,
      undefined,
      'INTERNAL_ERROR'
    )
  }

  // Handle unknown errors
  console.error('Unknown error:', error)
  return createErrorResponse('予期しないエラーが発生しました', 500, undefined, 'UNKNOWN_ERROR')
}

/**
 * Common error responses
 */
export const ErrorResponses = {
  unauthorized: () => createErrorResponse('認証が必要です', 401, undefined, 'UNAUTHORIZED'),
  forbidden: () => createErrorResponse('権限がありません', 403, undefined, 'FORBIDDEN'),
  notFound: (resource: string) =>
    createErrorResponse(`${resource}が見つかりません`, 404, undefined, 'NOT_FOUND'),
  badRequest: (message: string) => createErrorResponse(message, 400, undefined, 'BAD_REQUEST'),
  internalError: () =>
    createErrorResponse('内部エラーが発生しました', 500, undefined, 'INTERNAL_ERROR'),
  rateLimited: () =>
    createErrorResponse('リクエスト制限に達しました', 429, undefined, 'RATE_LIMITED'),
}

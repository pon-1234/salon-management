/**
 * @design_doc   Standardized API response format utilities
 * @related_to   All API routes
 * @known_issues None
 */
import { NextResponse } from 'next/server'

/**
 * Standard success response interface
 */
interface SuccessResponse<T = any> {
  data: T
  message?: string
  meta?: {
    total?: number
    page?: number
    limit?: number
    [key: string]: any
  }
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  meta?: SuccessResponse['meta']
): NextResponse<SuccessResponse<T>> {
  const response: SuccessResponse<T> = { data }
  if (message) response.message = message
  if (meta) response.meta = meta

  return NextResponse.json(response, { status: 200 })
}

/**
 * Creates a created (201) response
 */
export function createCreatedResponse<T>(
  data: T,
  message: string = 'リソースが作成されました'
): NextResponse<SuccessResponse<T>> {
  return NextResponse.json({ data, message }, { status: 201 })
}

/**
 * Creates a no content (204) response
 */
export function createNoContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

/**
 * Creates a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  message?: string
): NextResponse<SuccessResponse<T[]>> {
  return createSuccessResponse(data, message, {
    total,
    page,
    limit,
    hasNext: page * limit < total,
    hasPrevious: page > 1,
  })
}

/**
 * Common success response builders
 */
export const SuccessResponses = {
  ok: <T>(data: T, message?: string) => createSuccessResponse(data, message),
  created: <T>(data: T, message?: string) => createCreatedResponse(data, message),
  updated: <T>(data: T) => createSuccessResponse(data, '更新されました'),
  deleted: () => createSuccessResponse(null, '削除されました'),
  noContent: () => createNoContentResponse(),
  paginated: <T>(data: T[], total: number, page: number, limit: number) =>
    createPaginatedResponse(data, total, page, limit),
}

/**
 * Helper to extract pagination params from request
 */
export function getPaginationParams(request: Request): {
  page: number
  limit: number
} {
  const url = new URL(request.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)))

  return { page, limit }
}

/**
 * Helper to calculate pagination offset
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit
}

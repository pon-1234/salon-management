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
 * Standard error response interface
 */
interface ErrorResponse {
  error: string
  message?: string
  errors?: any[]
  code?: string
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  error: string,
  status: number,
  message?: string,
  errors?: any[]
): NextResponse<ErrorResponse> {
  const response: ErrorResponse = { error }
  if (message) response.message = message
  if (errors) response.errors = errors

  return NextResponse.json(response, { status })
}

/**
 * Common error response builders
 */
export const ErrorResponses = {
  badRequest: (message: string = '不正なリクエストです', errors?: any[]) =>
    createErrorResponse('Bad Request', 400, message, errors),
  unauthorized: (message: string = '認証が必要です') =>
    createErrorResponse('Unauthorized', 401, message),
  forbidden: (message: string = 'アクセス権限がありません') =>
    createErrorResponse('Forbidden', 403, message),
  notFound: (message: string = 'リソースが見つかりません') =>
    createErrorResponse('Not Found', 404, message),
  conflict: (message: string = 'リソースの競合が発生しました') =>
    createErrorResponse('Conflict', 409, message),
  unprocessableEntity: (message: string = '処理できないエンティティです', errors?: any[]) =>
    createErrorResponse('Unprocessable Entity', 422, message, errors),
  internalServerError: (message: string = 'サーバーエラーが発生しました') =>
    createErrorResponse('Internal Server Error', 500, message),
}

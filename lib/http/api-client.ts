import { resolveApiUrl } from './base-url'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface ApiRequestOptions extends Omit<RequestInit, 'body' | 'method'> {
  body?: BodyInit | Record<string, unknown> | null
  expectedStatus?: number[]
  parseJson?: boolean
  skipJsonSerialization?: boolean
}

export interface ApiClientOptions {
  defaults?: RequestInit
}

export class ApiError extends Error {
  readonly status: number
  readonly body?: unknown

  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

function mergeHeaders(
  base: HeadersInit | undefined,
  override: HeadersInit | undefined
): HeadersInit | undefined {
  if (!base) return override
  if (!override) return base

  const result = new Headers(base)
  new Headers(override).forEach((value, key) => {
    result.set(key, value)
  })
  return result
}

export class ApiClient {
  private readonly defaults: RequestInit

  constructor(options: ApiClientOptions = {}) {
    this.defaults = {
      credentials: 'include',
      cache: 'no-store',
      ...options.defaults,
    }
  }

  async request<T = unknown>(
    method: HttpMethod,
    path: string,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const url = resolveApiUrl(path)
    const {
      body,
      expectedStatus,
      parseJson = true,
      skipJsonSerialization = false,
      headers,
      ...rest
    } = options

    const hasBody = body !== undefined && body !== null
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
    const shouldSerialize = hasBody && !isFormData && !skipJsonSerialization
    const payload =
      hasBody && shouldSerialize && typeof body !== 'string'
        ? JSON.stringify(body)
        : ((body as BodyInit) ?? undefined)

    const finalHeaders = shouldSerialize
      ? mergeHeaders(
          headers,
          {
            'Content-Type': 'application/json',
          } satisfies HeadersInit
        )
      : headers

    const response = await fetch(url, {
      ...this.defaults,
      ...rest,
      method,
      headers: mergeHeaders(this.defaults.headers as HeadersInit, finalHeaders),
      body: payload,
    })

    const matchesExpected = expectedStatus
      ? expectedStatus.includes(response.status)
      : response.ok

    if (!matchesExpected) {
      let errorBody: unknown
      try {
        const text = await response.text()
        errorBody = text ? JSON.parse(text) : undefined
      } catch {
        errorBody = undefined
      }
      throw new ApiError(
        response.statusText || `Request to ${path} failed`,
        response.status,
        errorBody
      )
    }

    if (!parseJson || response.status === 204) {
      return undefined as T
    }

    const text = await response.text()
    if (!text) {
      return undefined as T
    }

    try {
      return JSON.parse(text) as T
    } catch {
      // If response isn't JSON but parseJson was true, return raw text
      return text as unknown as T
    }
  }

  get<T = unknown>(path: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('GET', path, options)
  }

  post<T = unknown>(
    path: string,
    body?: ApiRequestOptions['body'],
    options?: ApiRequestOptions
  ): Promise<T> {
    return this.request<T>('POST', path, { ...options, body })
  }

  put<T = unknown>(
    path: string,
    body?: ApiRequestOptions['body'],
    options?: ApiRequestOptions
  ): Promise<T> {
    return this.request<T>('PUT', path, { ...options, body })
  }

  delete<T = unknown>(path: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, { ...options, expectedStatus: options?.expectedStatus ?? [200, 204] })
  }
}

export const defaultApiClient = new ApiClient()

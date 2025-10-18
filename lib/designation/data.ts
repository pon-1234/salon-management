import { resolveApiUrl } from '@/lib/http/base-url'
import { DEFAULT_DESIGNATION_FEES } from './fees'
import type { DesignationFee, DesignationFeeInput } from './types'

type FetchOptions = {
  includeInactive?: boolean
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(resolveApiUrl(path), {
    credentials: 'include',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(body || `Failed request to ${path}: ${response.statusText}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

function mapDesignationFee(payload: any): DesignationFee {
  return {
    ...payload,
    description: payload.description ?? null,
    createdAt: payload.createdAt ? new Date(payload.createdAt) : undefined,
    updatedAt: payload.updatedAt ? new Date(payload.updatedAt) : undefined,
  }
}

export async function getDesignationFees(
  options: FetchOptions = {}
): Promise<DesignationFee[]> {
  const query = options.includeInactive ? '?includeInactive=true' : ''

  try {
    const result = await fetchJson<DesignationFee[]>(`/api/designation-fee${query}`)
    return Array.isArray(result)
      ? result.map(mapDesignationFee).sort((a, b) => a.sortOrder - b.sortOrder)
      : []
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to fetch designation fees, using defaults', error)
    }
    const fallback = options.includeInactive
      ? DEFAULT_DESIGNATION_FEES
      : DEFAULT_DESIGNATION_FEES.filter((fee) => fee.isActive)
    return fallback.map((fee) => ({ ...fee }))
  }
}

export async function createDesignationFee(
  payload: Omit<DesignationFeeInput, 'id'>
): Promise<DesignationFee> {
  const result = await fetchJson<DesignationFee>(`/api/designation-fee`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return mapDesignationFee(result)
}

export async function updateDesignationFee(
  id: string,
  payload: Partial<DesignationFeeInput>
): Promise<DesignationFee> {
  const result = await fetchJson<DesignationFee>(`/api/designation-fee`, {
    method: 'PUT',
    body: JSON.stringify({ id, ...payload }),
  })
  return mapDesignationFee(result)
}

export async function deleteDesignationFee(id: string): Promise<void> {
  await fetchJson(`/api/designation-fee?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

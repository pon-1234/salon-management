import { useState, useEffect, useCallback } from 'react'

interface UseAsyncDataOptions<T> {
  initialData?: T
  onError?: (error: Error) => void
  dependencies?: any[]
}

interface UseAsyncDataResult<T> {
  data: T | undefined
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  options: UseAsyncDataOptions<T> = {}
): UseAsyncDataResult<T> {
  const { initialData, onError, dependencies = [] } = options
  const [data, setData] = useState<T | undefined>(initialData)
  const [loading, setLoading] = useState<boolean>(!initialData)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await fetcher()
      setData(result)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An error occurred')
      setError(error)
      if (onError) {
        onError(error)
      }
    } finally {
      setLoading(false)
    }
  }, [fetcher, onError])

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, ...dependencies])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  }
}

// 複数のデータソースを扱う場合のフック
export function useMultipleAsyncData<T extends Record<string, any>>(fetchers: {
  [K in keyof T]: () => Promise<T[K]>
}): {
  data: Partial<T>
  loading: boolean
  errors: Partial<Record<keyof T, Error>>
  refetch: () => Promise<void>
} {
  const [data, setData] = useState<Partial<T>>({})
  const [loading, setLoading] = useState<boolean>(true)
  const [errors, setErrors] = useState<Partial<Record<keyof T, Error>>>({})

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setErrors({})

    const results: Partial<T> = {}
    const resultErrors: Partial<Record<keyof T, Error>> = {}

    await Promise.all(
      Object.entries(fetchers).map(async ([key, fetcher]) => {
        try {
          results[key as keyof T] = await fetcher()
        } catch (err) {
          resultErrors[key as keyof T] =
            err instanceof Error ? err : new Error(`Failed to fetch ${key}`)
        }
      })
    )

    setData(results)
    setErrors(resultErrors)
    setLoading(false)
  }, [fetchers])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  return {
    data,
    loading,
    errors,
    refetch: fetchAll,
  }
}

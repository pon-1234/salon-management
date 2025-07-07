import { useState, useMemo, useCallback } from 'react'

interface UsePaginationOptions {
  initialPage?: number
  initialPageSize?: number
  pageSizeOptions?: number[]
}

interface UsePaginationResult<T> {
  currentPage: number
  pageSize: number
  totalPages: number
  paginatedData: T[]
  canPreviousPage: boolean
  canNextPage: boolean
  gotoPage: (page: number) => void
  nextPage: () => void
  previousPage: () => void
  setPageSize: (size: number) => void
  pageRange: number[]
}

export function usePagination<T>(
  data: T[],
  options: UsePaginationOptions = {}
): UsePaginationResult<T> {
  const { initialPage = 1, initialPageSize = 10, pageSizeOptions = [10, 20, 30, 50, 100] } = options

  const [currentPage, setCurrentPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const totalPages = useMemo(() => {
    return Math.ceil(data.length / pageSize)
  }, [data.length, pageSize])

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return data.slice(startIndex, endIndex)
  }, [data, currentPage, pageSize])

  const canPreviousPage = currentPage > 1
  const canNextPage = currentPage < totalPages

  const gotoPage = useCallback(
    (page: number) => {
      const pageNumber = Math.max(1, Math.min(page, totalPages))
      setCurrentPage(pageNumber)
    },
    [totalPages]
  )

  const nextPage = useCallback(() => {
    if (canNextPage) {
      setCurrentPage((prev) => prev + 1)
    }
  }, [canNextPage])

  const previousPage = useCallback(() => {
    if (canPreviousPage) {
      setCurrentPage((prev) => prev - 1)
    }
  }, [canPreviousPage])

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size)
    setCurrentPage(1) // Reset to first page when page size changes
  }, [])

  // Generate page range for pagination UI
  const pageRange = useMemo(() => {
    const range: number[] = []
    const maxPagesToShow = 5

    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2))
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1)

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      range.push(i)
    }

    return range
  }, [currentPage, totalPages])

  return {
    currentPage,
    pageSize,
    totalPages,
    paginatedData,
    canPreviousPage,
    canNextPage,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize: handlePageSizeChange,
    pageRange,
  }
}

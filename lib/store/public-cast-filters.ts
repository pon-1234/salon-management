/**
 * @design_doc   ui-improvement-instructions.md U-3 cast list filters
 * @related_to   app/[store]/cast/page.tsx: public cast list controls
 * @known_issues Newcomer filtering is omitted until a public profile flag exists
 */
import type { PublicCastProfile } from '@/lib/store/public-casts'

export type CastListFilter = 'all' | 'working-today' | 'top-designated' | 'net-reservation'

const FILTERS = new Set<CastListFilter>([
  'all',
  'working-today',
  'top-designated',
  'net-reservation',
])

export function normalizeCastListFilter(value: string | undefined): CastListFilter {
  return value && FILTERS.has(value as CastListFilter) ? (value as CastListFilter) : 'all'
}

export function filterPublicCasts(
  casts: PublicCastProfile[],
  filter: CastListFilter
): PublicCastProfile[] {
  switch (filter) {
    case 'working-today':
      return casts.filter((cast) => cast.workStatus === '出勤')
    case 'top-designated':
      return casts
        .filter((cast) => cast.panelDesignationRank > 0)
        .sort((a, b) => a.panelDesignationRank - b.panelDesignationRank)
    case 'net-reservation':
      return casts.filter((cast) => cast.netReservation)
    case 'all':
    default:
      return casts
  }
}

export function paginatePublicCasts(
  casts: PublicCastProfile[],
  page: number,
  pageSize: number
): { currentPage: number; items: PublicCastProfile[]; totalPages: number } {
  const totalPages = Math.max(Math.ceil(casts.length / pageSize), 1)
  const currentPage = Math.min(Math.max(Math.trunc(page) || 1, 1), totalPages)
  const start = (currentPage - 1) * pageSize

  return {
    currentPage,
    items: casts.slice(start, start + pageSize),
    totalPages,
  }
}

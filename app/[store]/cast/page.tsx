/**
 * @design_doc   ui-improvement-instructions.md U-3 cast list filters and pagination
 * @related_to   public-cast-filters: query-driven public cast filtering
 * @known_issues Newcomer filter is omitted until public cast data exposes a reliable flag
 */
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchStoreBySlug } from '@/lib/store/public-api'
import { StoreNavigation } from '@/components/store-navigation'
import { StoreFooter } from '@/components/store-footer'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SafeImage } from '@/components/ui/safe-image'
import { Star, Heart, Crown } from 'lucide-react'
import Link from 'next/link'
import { getPublicCastProfiles, type PublicCastProfile } from '@/lib/store/public-casts'
import {
  filterPublicCasts,
  normalizeCastListFilter,
  paginatePublicCasts,
  type CastListFilter,
} from '@/lib/store/public-cast-filters'

const CASTS_PER_PAGE = 12

export const metadata: Metadata = {
  title: '在籍一覧',
}

const filterOptions: Array<{ value: CastListFilter; label: string }> = [
  { value: 'all', label: 'すべて' },
  { value: 'working-today', label: '本日出勤' },
  { value: 'top-designated', label: '指名上位' },
  { value: 'net-reservation', label: 'ネット予約可' },
]

function buildMeasurementLabel(cast: PublicCastProfile) {
  const parts = [
    cast.height ? `T${cast.height}` : null,
    cast.bust ? `B${cast.bust}` : null,
    cast.waist ? `W${cast.waist}` : null,
    cast.hip ? `H${cast.hip}` : null,
  ].filter(Boolean)

  return parts.join(' ')
}

export default async function CastListPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string }>
  searchParams?: Promise<{ filter?: string; page?: string }>
}) {
  const { store: storeSlug } = await params
  const resolvedSearchParams = (await searchParams) ?? {}
  const store = await fetchStoreBySlug(storeSlug)

  if (!store) {
    notFound()
  }

  const casts: PublicCastProfile[] = await getPublicCastProfiles(store.id)
  const activeFilter = normalizeCastListFilter(resolvedSearchParams.filter)
  const requestedPage = Number(resolvedSearchParams.page ?? '1')
  const filteredCasts = filterPublicCasts(casts, activeFilter)
  const {
    currentPage,
    items: visibleCasts,
    totalPages,
  } = paginatePublicCasts(filteredCasts, requestedPage, CASTS_PER_PAGE)
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1)
  const buildCastListHref = (filter: CastListFilter, page = 1) => {
    const query = new URLSearchParams()
    if (filter !== 'all') {
      query.set('filter', filter)
    }
    if (page > 1) {
      query.set('page', String(page))
    }
    const queryString = query.toString()
    return `/${store.slug}/cast${queryString ? `?${queryString}` : ''}`
  }

  return (
    <>
      <StoreNavigation />

      <main className="min-h-screen bg-luxury-black-deep text-foreground">
        <div className="relative overflow-hidden border-b border-luxury-border-dark bg-[#0f0f0f] py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,206,126,0.18),_transparent_60%)]" />
          <div className="relative mx-auto max-w-6xl px-4 text-center">
            <p className="luxury-display text-xs tracking-[0.45em] text-luxury-gold-heading">
              THERAPIST
            </p>
            <h1 className="mt-4 text-3xl font-semibold text-luxury-gold-title md:text-4xl">
              在籍一覧
            </h1>
            <p className="mt-3 text-sm text-luxury-gold-dim md:text-base">
              {store.name}の魅力的なキャスト
            </p>
          </div>
        </div>

        <div className="sticky top-16 z-40 border-b border-luxury-border bg-luxury-panel-dark/95 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-4">
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <Button
                  key={option.value}
                  asChild
                  variant={activeFilter === option.value ? 'default' : 'outline'}
                  size="sm"
                  className={
                    activeFilter === option.value
                      ? ''
                      : 'border-luxury-border text-luxury-gold-cream hover:bg-luxury-brown-muted'
                  }
                >
                  <Link href={buildCastListHref(option.value)}>{option.label}</Link>
                </Button>
              ))}
            </div>
          </div>
        </div>

        <section className="py-8">
          <div className="mx-auto max-w-6xl px-4">
            {visibleCasts.length === 0 ? (
              <Card className="luxury-panel">
                <CardContent className="p-10 text-center text-muted-foreground">
                  {casts.length === 0
                    ? '現在、表示できるキャスト情報がありません。最新の在籍状況はお問い合わせください。'
                    : '条件に一致するキャスト情報がありません。'}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
                {visibleCasts.map((cast) => {
                  const measurement = buildMeasurementLabel(cast)
                  return (
                    <Card
                      key={cast.id}
                      className="luxury-panel transition-shadow hover:shadow-[0_20px_40px_rgba(0,0,0,0.45)]"
                    >
                      <CardHeader className="p-4 pb-2">
                        <div className="relative">
                          <div className="mb-3 aspect-[3/4] overflow-hidden rounded-lg border border-[#4a3b28] bg-[#0f0f0f]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <SafeImage
                              src={cast.image ?? '/images/non-photo.svg'}
                              alt={cast.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          {cast.panelDesignationRank > 0 && cast.panelDesignationRank <= 3 && (
                            <Badge
                              className={`absolute left-2 top-2 ${
                                cast.panelDesignationRank === 1
                                  ? 'bg-luxury-gold-bright text-luxury-text-dark'
                                  : cast.panelDesignationRank === 2
                                    ? 'bg-[#bfc3c8] text-luxury-panel-soft'
                                    : 'bg-[#c97a3f] text-luxury-panel-soft'
                              }`}
                            >
                              <Crown className="mr-1 h-3 w-3" />
                              {cast.panelDesignationRank}位
                            </Badge>
                          )}
                          {cast.workStatus === '出勤' && (
                            <Badge className="absolute bottom-2 left-2 bg-luxury-aqua text-luxury-aqua-deep">
                              出勤中
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 p-4 pt-0">
                        <div>
                          <h3 className="text-lg font-semibold text-luxury-gold-cream">
                            {cast.name}
                          </h3>
                          {(cast.specialDesignationFee ?? 0) > 0 && (
                            <p className="text-xs font-medium text-luxury-gold-heading">
                              特別指名料
                              {cast.specialDesignationFeeLabel
                                ? ` ${cast.specialDesignationFeeLabel}`
                                : ''}{' '}
                              {cast.specialDesignationFee?.toLocaleString()}円
                            </p>
                          )}
                          {(cast.panelTakeHomeBonus ?? 0) > 0 && (
                            <p className="text-xs text-luxury-gold-muted">
                              パネル指名手取UP {cast.panelTakeHomeBonusLabel}{' '}
                              {cast.panelTakeHomeBonus?.toLocaleString()}円
                            </p>
                          )}
                          {(cast.regularTakeHomeBonus ?? 0) > 0 && (
                            <p className="text-xs text-luxury-gold-muted">
                              本指名手取UP {cast.regularTakeHomeBonusLabel}{' '}
                              {cast.regularTakeHomeBonus?.toLocaleString()}円
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {cast.age ? `${cast.age}歳` : '年齢非公開'} {measurement}
                          </p>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-luxury-gold text-luxury-gold" />
                            <span className="text-sm font-medium text-luxury-gold-cream">
                              {cast.panelDesignationRank > 0
                                ? `Rank ${cast.panelDesignationRank}`
                                : '注目キャスト'}
                            </span>
                          </div>
                          <Heart className="h-4 w-4 text-[#f28b96]" />
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {cast.type && (
                            <Badge className="border border-luxury-border bg-luxury-panel-soft text-xs text-luxury-gold-muted">
                              {cast.type}
                            </Badge>
                          )}
                          {cast.netReservation && (
                            <Badge className="border border-luxury-border bg-luxury-panel-soft text-xs text-luxury-gold-muted">
                              ネット予約可
                            </Badge>
                          )}
                          {cast.availableServices.slice(0, 2).map((service) => (
                            <Badge
                              key={service}
                              variant="outline"
                              className="border-luxury-border text-xs text-luxury-gold-muted"
                            >
                              {service}
                            </Badge>
                          ))}
                        </div>

                        <div className="space-y-2 pt-2">
                          <Button asChild className="w-full" size="sm">
                            <Link href={`/${store.slug}/cast/${cast.id}`}>詳細を見る</Link>
                          </Button>
                          <Button
                            asChild
                            variant="outline"
                            className="w-full border-luxury-border text-luxury-gold-cream hover:bg-luxury-brown-muted"
                            size="sm"
                          >
                            <Link href={`/${store.slug}/booking?cast=${cast.id}`}>予約する</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {totalPages > 1 && (
          <div className="py-8">
            <div className="mx-auto max-w-6xl px-4">
              <div className="flex justify-center gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-luxury-border text-luxury-gold-cream hover:bg-luxury-brown-muted"
                >
                  <Link href={buildCastListHref(activeFilter, Math.max(currentPage - 1, 1))}>
                    前へ
                  </Link>
                </Button>
                {pageNumbers.map((page) => (
                  <Button
                    key={page}
                    asChild
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    className={
                      currentPage === page
                        ? ''
                        : 'border-luxury-border text-luxury-gold-cream hover:bg-luxury-brown-muted'
                    }
                  >
                    <Link href={buildCastListHref(activeFilter, page)}>{page}</Link>
                  </Button>
                ))}
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-luxury-border text-luxury-gold-cream hover:bg-luxury-brown-muted"
                >
                  <Link
                    href={buildCastListHref(activeFilter, Math.min(currentPage + 1, totalPages))}
                  >
                    次へ
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        <StoreFooter store={store} />
      </main>
    </>
  )
}

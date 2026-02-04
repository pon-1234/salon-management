'use client'

import type { ComponentType } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CalendarDays,
  Coins,
  Crown,
  Heart,
  MessageSquare,
  NotebookPen,
  Phone,
  Sparkles,
  Star,
  TrendingUp,
  UserRound,
} from 'lucide-react'
import { Store } from '@/lib/store/types'
import { StoreNavigation } from './store-navigation'
import { StoreFooter } from './store-footer'
import { CampaignBannerSlider, BannerItem } from './campaign-banner-slider'
import type {
  PublicStoreHomeData,
  PublicCastSummary,
  PublicScheduleSummary,
  PublicReviewSummary,
} from '@/lib/store/public-types'

interface StoreHomeContentProps {
  store: Store
  data: PublicStoreHomeData | null
}

const FALLBACK_STATS = {
  totalCasts: '150+',
  averageRating: '4.8',
  openHoursLabel: '24H',
}

function buildBannerItems(store: Store, data?: PublicStoreHomeData | null): BannerItem[] {
  const banners = data?.banners ?? []
  if (!banners.length) {
    return []
  }

  return banners.map((banner) => ({
    ...banner,
    link: banner.link?.startsWith('/') ? banner.link : banner.link ?? `/${store.slug}/pricing`,
  }))
}

function formatSizeLabel(cast: PublicCastSummary): string {
  if (cast.sizeLabel && cast.sizeLabel.trim().length > 0) {
    return cast.sizeLabel
  }

  const parts = [
    cast.height ? `T${cast.height}` : null,
    cast.bust ? `B${cast.bust}` : null,
    cast.waist ? `W${cast.waist}` : null,
    cast.hip ? `H${cast.hip}` : null,
  ].filter(Boolean)

  return parts.join(' ') || 'サイズ情報未登録'
}

function formatScheduleRange(schedule: PublicScheduleSummary): string {
  try {
    const start = format(new Date(schedule.startTime), 'HH:mm')
    const end = format(new Date(schedule.endTime), 'HH:mm')
    return `${start} - ${end}`
  } catch {
    return '時間未定'
  }
}

function formatReviewDate(review: PublicReviewSummary): string {
  try {
    return format(new Date(review.createdAt), 'MM月dd日 HH:mm', { locale: ja })
  } catch {
    return ''
  }
}

export function StoreHomeContent({ store, data }: StoreHomeContentProps) {
  const banners = buildBannerItems(store, data)
  const ranking = data?.highlights?.ranking ?? []
  const newcomers = data?.highlights?.newcomers ?? []
  const todaysSchedules = data?.highlights?.todaysSchedules ?? []
  const reviews = data?.reviews ?? []
  const heroImage = store.images?.main || store.images?.gallery?.[0] || '/images/banners/campaign-1.jpg'

  return (
    <div className="luxury-body bg-[#0b0b0b] text-white">
      <StoreNavigation />

      <main className="relative">
        {/* Hero Section */}
        <section className="relative min-h-[70vh] overflow-hidden">
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroImage} alt={store.displayName} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/90" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,206,126,0.25),_transparent_55%)]" />
          </div>

          <div className="relative z-10 mx-auto max-w-6xl px-4 py-20 sm:py-28">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#f3d08a]/60 bg-black/50 px-4 py-2 text-xs uppercase tracking-[0.4em] text-[#f3d08a]">
              <Crown className="h-4 w-4" />
              Tokyo Premium
            </div>

            <div className="mt-6 space-y-6">
              <h1 className="luxury-display luxury-text-shadow text-4xl font-semibold text-[#f7e2b5] sm:text-5xl md:text-6xl">
                {store.displayName}
              </h1>
              <p className="max-w-2xl text-lg text-[#f5e6c4] sm:text-xl">
                都内屈指のラグジュアリー空間で、五感を刺激する濃密トリートメントを。
                完全予約制のプライベートサロンで極上の時間をご提供します。
              </p>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-[#f6dfab] to-[#c79548] px-8 py-6 text-base font-semibold text-[#2b1b0d] shadow-[0_12px_30px_rgba(0,0,0,0.55)] transition hover:from-[#ffe8bf] hover:to-[#e2b463]"
                >
                  <Phone className="mr-2 h-5 w-5" />
                  今すぐ予約
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-[#f3d08a]/70 px-8 py-6 text-base font-semibold text-[#f5e6c4] hover:bg-[#2b2114]"
                  asChild
                >
                  <Link href={`/${store.slug}/cast`}>セラピストを見る</Link>
                </Button>
              </div>

              {store.features?.length ? (
                <div className="flex flex-wrap gap-3 pt-4">
                  {store.features.map((feature) => (
                    <span
                      key={feature}
                      className="rounded-full border border-[#f3d08a]/40 bg-black/40 px-4 py-1 text-xs text-[#f5e6c4]"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 pt-8 sm:grid-cols-3">
                <StatCard label="在籍セラピスト" value={FALLBACK_STATS.totalCasts} />
                <StatCard label="平均評価" value={FALLBACK_STATS.averageRating} />
                <StatCard label="営業時間" value={FALLBACK_STATS.openHoursLabel} />
              </div>
            </div>
          </div>
        </section>

        <div className="luxury-section py-10">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading title="PICK UP" subtitle="最新キャンペーン" />
          </div>
          <CampaignBannerSlider
            banners={banners}
            autoPlayInterval={5000}
            showDots={true}
            dismissible={false}
          />
        </div>

        <section className="luxury-section py-16">
          <div className="mx-auto max-w-4xl space-y-6 px-4 text-center">
            <SectionHeading title="CONCEPT" subtitle="至福の密着トリートメント" />
            <p className="text-lg text-[#f5e6c4]">
              寝ているだけで極上の癒やしを。洗練されたセラピストの手技が、
              日常から解き放つ非日常のひとときを演出します。
            </p>
            <p className="text-sm text-[#d7c39c]">
              完全個室、上質なアロマ、厳選されたプログラムで、
              あなたのためだけの特別な時間をお届けします。
            </p>
          </div>
        </section>

        <section className="luxury-section py-16">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading title="RANKING" subtitle="人気ランキング" icon={TrendingUp} />
            {ranking.length === 0 ? (
              <div className="mt-8 rounded-lg border border-dashed border-[#3b2e1f] bg-black/40 p-10 text-center text-[#cbb88f]">
                表示できるランキング情報がありません。
              </div>
            ) : (
              <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-4">
                {ranking.slice(0, 4).map((cast) => (
                  <RankingCard key={cast.id} cast={cast} />
                ))}
              </div>
            )}
            <div className="mt-10 text-center">
              <Button
                asChild
                variant="outline"
                className="border-[#f3d08a]/60 text-[#f5e6c4] hover:bg-[#2b2114]"
              >
                <Link href={`/${store.slug}/ranking`}>もっと見る</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="luxury-section py-16">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading title="NEW FACE" subtitle="新人紹介" icon={Sparkles} />
            {newcomers.length === 0 ? (
              <div className="mt-8 rounded-lg border border-dashed border-[#3b2e1f] bg-black/40 p-10 text-center text-[#cbb88f]">
                新人キャストの情報は現在準備中です。
              </div>
            ) : (
              <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
                {newcomers.slice(0, 4).map((cast) => (
                  <CastSummaryCard key={cast.id} cast={cast} />
                ))}
              </div>
            )}
            <div className="mt-10 text-center">
              <Button
                asChild
                className="bg-gradient-to-r from-[#f6dfab] to-[#c79548] text-[#2b1b0d] hover:from-[#ffe8bf] hover:to-[#e2b463]"
              >
                <Link href={`/${store.slug}/cast`}>もっと見る</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="luxury-section py-16">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading title="SCHEDULE" subtitle="本日の出勤" icon={CalendarDays} />
            {todaysSchedules.length === 0 ? (
              <div className="mt-8 rounded-lg border border-dashed border-[#3b2e1f] bg-black/40 p-10 text-center text-[#cbb88f]">
                本日出勤予定のキャスト情報はありません。最新の出勤情報はスケジュールページでご確認ください。
              </div>
            ) : (
              <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
                {todaysSchedules.slice(0, 4).map((schedule) => (
                  <ScheduleCard key={schedule.castId} schedule={schedule} />
                ))}
              </div>
            )}
            <div className="mt-10 text-center">
              <Button
                asChild
                variant="outline"
                className="border-[#f3d08a]/60 text-[#f5e6c4] hover:bg-[#2b2114]"
              >
                <Link href={`/${store.slug}/schedule`}>もっと見る</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="luxury-section py-16">
          <div className="mx-auto max-w-5xl px-4">
            <SectionHeading title="VOICE" subtitle="お客様の声" icon={MessageSquare} />
            {reviews.length === 0 ? (
              <div className="mt-8 rounded-lg border border-dashed border-[#3b2e1f] bg-black/40 p-10 text-center text-[#cbb88f]">
                まだ口コミが投稿されていません。初めてのご利用後にぜひご感想をお寄せください。
              </div>
            ) : (
              <div className="mt-8 space-y-6">
                {reviews.slice(0, 6).map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            )}
          </div>
        </section>

      </main>

      <StoreFooter store={store} />
      <FloatingQuickNav store={store} />
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="luxury-panel flex flex-col items-center justify-center gap-2 rounded-md px-6 py-4 text-center">
      <div className="luxury-display text-2xl text-[#f6d48a]">{value}</div>
      <div className="text-xs text-[#d7c39c]">{label}</div>
    </div>
  )
}

function SectionHeading({
  title,
  subtitle,
  icon: Icon,
}: {
  title: string
  subtitle: string
  icon?: ComponentType<{ className?: string }>
}) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-2 text-[#f3d08a]">
        {Icon ? <Icon className="h-5 w-5" /> : null}
        <p className="luxury-display text-sm tracking-[0.4em]">{title}</p>
      </div>
      <h2 className="mt-3 text-2xl font-semibold text-[#f5e6c4]">{subtitle}</h2>
      <div className="mx-auto mt-4 h-px w-32 bg-gradient-to-r from-transparent via-[#caa45a] to-transparent" />
    </div>
  )
}

function RankingCard({ cast }: { cast: PublicCastSummary }) {
  const badgeClass =
    cast.panelDesignationRank === 1
      ? 'bg-[#f6d48a] text-[#2b1b0d]'
      : cast.panelDesignationRank === 2
        ? 'bg-[#bfc3c8] text-[#1a1a1a]'
        : cast.panelDesignationRank === 3
          ? 'bg-[#c97a3f] text-[#1a1a1a]'
          : 'bg-[#2a2a2a] text-[#f5e6c4]'

  return (
    <div className="luxury-panel overflow-hidden rounded-md">
      <div className="flex items-center justify-between border-b border-[#3b2e1f] bg-[#161616] px-4 py-3">
        <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', badgeClass)}>
          {cast.panelDesignationRank > 0 ? `${cast.panelDesignationRank}位` : 'ランク外'}
        </span>
        <Heart className="h-4 w-4 text-[#f28b96]" />
      </div>
      <div className="p-4">
        <div className="relative mb-4 aspect-[3/4] overflow-hidden border border-[#4a3b28] bg-[#0f0f0f]">
          {cast.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cast.images[0]} alt={cast.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-[#cbb88f]">
              NO IMAGE
            </div>
          )}
          {cast.panelDesignationRank === 1 ? (
            <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] text-[#f6d48a]">
              <Crown className="h-3 w-3" />
              No.1
            </div>
          ) : null}
        </div>
        <h3 className="text-lg font-semibold text-[#f5e6c4]">{cast.name}</h3>
        {cast.age && <p className="text-sm text-[#d7c39c]">{cast.age}歳</p>}
        <p className="mt-1 text-xs text-[#cbb88f]">{formatSizeLabel(cast)}</p>
      </div>
    </div>
  )
}

function CastSummaryCard({ cast }: { cast: PublicCastSummary }) {
  return (
    <div className="luxury-panel overflow-hidden rounded-md">
      <div className="p-4">
        <div className="relative mb-3 aspect-[3/4] overflow-hidden border border-[#4a3b28] bg-[#0f0f0f]">
          {cast.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cast.images[0]} alt={cast.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-[#cbb88f]">
              NO IMAGE
            </div>
          )}
          <span className="absolute left-3 top-3 rounded bg-[#2fc8b7] px-2 py-1 text-[10px] font-semibold text-[#0b1a17]">
            NEW
          </span>
        </div>
        <h3 className="font-semibold text-[#f5e6c4]">{cast.name}</h3>
        {cast.age && <p className="text-sm text-[#d7c39c]">{cast.age}歳</p>}
        <p className="text-xs text-[#cbb88f]">{formatSizeLabel(cast)}</p>
      </div>
    </div>
  )
}

function ScheduleCard({ schedule }: { schedule: PublicScheduleSummary }) {
  const { cast } = schedule
  return (
    <div className="luxury-panel overflow-hidden rounded-md">
      <div className="p-4">
        <div className="relative mb-3 aspect-[3/4] overflow-hidden border border-[#4a3b28] bg-[#0f0f0f]">
          {cast.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cast.images[0]} alt={cast.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-[#cbb88f]">
              NO IMAGE
            </div>
          )}
          <span className="absolute right-3 top-3 rounded bg-[#1d1d1d]/80 px-2 py-1 text-[10px] text-[#f5e6c4]">
            出勤
          </span>
        </div>
        <h3 className="font-semibold text-[#f5e6c4]">{cast.name}</h3>
        {cast.age && <p className="text-sm text-[#d7c39c]">{cast.age}歳</p>}
        <p className="text-xs text-[#cbb88f]">{formatSizeLabel(cast)}</p>
        <Badge className="mt-3 w-full justify-center border border-[#f3d08a]/60 bg-transparent text-[#f3d08a]">
          {formatScheduleRange(schedule)}
        </Badge>
      </div>
    </div>
  )
}

function ReviewCard({ review }: { review: PublicReviewSummary }) {
  return (
    <div className="luxury-panel rounded-md p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-[#f5e6c4]">{review.castName}</h4>
          <p className="text-sm text-[#d7c39c]">{review.customerAlias}</p>
          <p className="text-xs text-[#cbb88f]">{formatReviewDate(review)}</p>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: review.rating }).map((_, index) => (
            <Star key={index} className="h-4 w-4 fill-[#f3d08a] text-[#f3d08a]" />
          ))}
        </div>
      </div>
      <p className="text-sm text-[#f0e3c8]">{review.comment}</p>
    </div>
  )
}

function FloatingQuickNav({ store }: { store: Store }) {
  const quickLinks = [
    { label: 'セラピスト', href: `/${store.slug}/cast`, icon: UserRound },
    { label: 'スケジュール', href: `/${store.slug}/schedule`, icon: CalendarDays },
    { label: 'システム', href: `/${store.slug}/pricing`, icon: Coins },
    { label: 'ネット予約', href: `/${store.slug}/booking`, icon: NotebookPen },
    { label: '電話', href: `tel:${store.phone}`, icon: Phone },
  ]

  return (
    <div className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
      {quickLinks.map((link) => {
        const content = (
          <>
            <link.icon className="h-5 w-5" />
            <span className="text-[10px] tracking-[0.2em]">{link.label}</span>
          </>
        )

        const className =
          'group flex w-20 flex-col items-center gap-2 rounded-md border border-[#3b2e1f] bg-[#1a1a1a]/90 px-2 py-3 text-[#f5e6c4] shadow-[0_8px_22px_rgba(0,0,0,0.55)] transition hover:border-[#f3d08a] hover:text-[#f6d48a]'

        return link.href.startsWith('tel:') ? (
          <a key={link.label} href={link.href} className={className} aria-label={link.label}>
            {content}
          </a>
        ) : (
          <Link key={link.label} href={link.href} className={className} aria-label={link.label}>
            {content}
          </Link>
        )
      })}
    </div>
  )
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ')
}

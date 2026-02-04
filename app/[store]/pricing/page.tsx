import { notFound } from 'next/navigation'
import { fetchStoreBySlug } from '@/lib/store/public-api'
import { StoreNavigation } from '@/components/store-navigation'
import { StoreFooter } from '@/components/store-footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Star, Phone } from 'lucide-react'
import { getPublicStorePricing } from '@/lib/store/public-pricing'

const OPTION_CATEGORY_LABELS: Record<string, string> = {
  special: '特別オプション',
  relaxation: 'リラクゼーション',
  'body-care': 'ボディケア',
  extension: '延長メニュー',
}

const COURSE_HIGHLIGHTS = [
  { label: '初めての方におすすめ', matcher: (duration: number) => duration <= 70 },
  { label: '人気No.1', matcher: (_duration: number, index: number) => index === 1 },
  { label: 'ご褒美タイム', matcher: (duration: number) => duration >= 120 },
]

function pickHighlight(duration: number, index: number) {
  const highlight = COURSE_HIGHLIGHTS.find((entry) => entry.matcher(duration, index))
  return highlight?.label ?? null
}

export default async function PricingPage({ params }: { params: { store: string } }) {
  const { store: storeSlug } = params
  const store = await fetchStoreBySlug(storeSlug)

  if (!store) {
    notFound()
  }

  const storePricing = await getPublicStorePricing(store.id)
  const { courses, options, additionalFees, notes } = storePricing

  const sortedCourses = courses
    .slice()
    .sort((a, b) => a.duration - b.duration || a.price - b.price)

  const optionsByCategory = options.reduce(
    (acc, option) => {
      const category = option.category ?? 'others'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(option)
      return acc
    },
    {} as Record<string, typeof options>
  )

  const normalizedPhone = store.phone?.replace(/[^\d+]/g, '') ?? ''

  return (
    <>
      <StoreNavigation />

      <main className="min-h-screen bg-[#0b0b0b] text-foreground">
        <div className="relative overflow-hidden border-b border-[#2f2416] bg-[#0f0f0f] py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,206,126,0.18),_transparent_60%)]" />
          <div className="relative mx-auto max-w-6xl px-4 text-center">
            <p className="luxury-display text-xs tracking-[0.45em] text-[#d7b46a]">PRICING</p>
            <h1 className="mt-4 text-3xl font-semibold text-[#f7e2b5] md:text-4xl">料金システム</h1>
            <p className="mt-3 text-sm text-[#d7c39c] md:text-base">
              わかりやすい料金で安心してご利用いただけます
            </p>
          </div>
        </div>

        <section className="luxury-section py-12">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="mb-12 text-center text-2xl font-semibold text-[#f5e6c4] md:text-3xl">
              コース料金
            </h2>
            <div
              className={`grid grid-cols-1 gap-8 ${
                sortedCourses.length >= 3
                  ? 'md:grid-cols-3'
                  : sortedCourses.length === 2
                    ? 'mx-auto max-w-5xl md:grid-cols-2'
                    : ''
              }`}
            >
              {sortedCourses.map((course, index) => {
                const highlight = pickHighlight(course.duration, index)

                return (
                  <Card key={course.id} className="luxury-panel flex flex-col">
                    <CardHeader className="space-y-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-xl text-[#f5e6c4] lg:text-2xl">
                          {course.name}
                        </CardTitle>
                        {highlight && (
                          <Badge className="bg-[#f6d48a] text-[#2b1b0d]">{highlight}</Badge>
                        )}
                      </div>
                      {course.description && (
                        <p className="text-sm text-muted-foreground">{course.description}</p>
                      )}
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col space-y-6">
                      <div className="rounded-lg border border-[#3b2e1f] bg-[#121212] p-4">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Clock className="h-4 w-4 text-[#cbb88f]" />
                            {course.duration}分
                          </span>
                          <span className="text-2xl font-bold text-[#f6d48a]">
                            ¥{course.price.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>・カウンセリングからご退店まで丁寧にご案内いたします。</li>
                        <li>・施術前後はシャワールームとアメニティを自由にご利用いただけます。</li>
                        <li>・表示金額は税込です。追加料金はございません。</li>
                      </ul>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>

        <section className="luxury-section py-12">
          <div className="mx-auto max-w-4xl px-4">
            <h2 className="mb-12 text-center text-2xl font-semibold text-[#f5e6c4] md:text-3xl">
              オプション料金
            </h2>
            {Object.entries(optionsByCategory).map(([category, categoryOptions]) => (
              <div key={category} className="mb-10">
                <h3 className="mb-4 text-xl font-semibold text-[#f5e6c4]">
                  {OPTION_CATEGORY_LABELS[category] ?? 'その他オプション'}
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {categoryOptions.map((option) => (
                    <Card
                      key={option.id}
                      className={`luxury-panel ${option.isPopular ? 'relative border-[#f6d48a] shadow-md' : ''}`}
                    >
                      {option.isPopular && option.note && (
                        <Badge className="absolute -right-2 -top-2 bg-[#f6d48a] text-[#2b1b0d]">
                          {option.note}
                        </Badge>
                      )}
                      <CardContent className="flex h-full flex-col gap-3 p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-lg font-medium text-[#f5e6c4]">{option.name}</p>
                            {option.description && (
                              <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
                            )}
                            {option.duration && (
                              <p className="mt-1 text-sm text-[#cbb88f]">
                                <Clock className="mr-1 inline h-3 w-3 text-[#cbb88f]" />
                                {option.duration}分
                              </p>
                            )}
                          </div>
                          <span
                            className={`ml-4 text-xl font-bold ${
                              option.price === 0 ? 'text-[#2fc8b7]' : 'text-[#f6d48a]'
                            }`}
                          >
                            {option.price === 0 ? '無料' : `¥${option.price.toLocaleString()}`}
                          </span>
                        </div>
                        {!option.isPopular && option.note && (
                          <p className="text-xs text-[#cbb88f]">{option.note}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="luxury-section py-12">
          <div className="mx-auto max-w-4xl px-4">
            <h2 className="mb-12 text-center text-2xl font-semibold text-[#f5e6c4] md:text-3xl">
              その他料金
            </h2>
            <Card className="luxury-panel">
              <CardContent className="space-y-4 p-8">
                {additionalFees.map((fee, index) => (
                  <div
                    key={fee.id}
                    className={`flex items-center justify-between py-3 ${
                      index < additionalFees.length - 1 ? 'border-b border-[#2f2416]' : ''
                    }`}
                  >
                    <div>
                      <p className="text-lg font-medium text-[#f5e6c4]">{fee.name}</p>
                      {fee.description && (
                        <p className="text-sm text-muted-foreground">{fee.description}</p>
                      )}
                    </div>
                    <span className="text-lg font-bold text-[#f6d48a]">
                      {fee.type === 'fixed' && `¥${(fee.value as number).toLocaleString()}`}
                      {fee.type === 'percentage' && `${fee.value}%増`}
                      {fee.type === 'range' &&
                        typeof fee.value === 'object' &&
                        `¥${fee.value.min.toLocaleString()}〜¥${fee.value.max.toLocaleString()}`}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="luxury-section py-12">
          <div className="mx-auto max-w-4xl px-4">
            <Card className="luxury-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#f5e6c4]">
                  <Star className="h-5 w-5 text-[#f3d08a]" />
                  ご利用にあたって
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {notes.map((note, index) => (
                  <p key={index}>・{note}</p>
                ))}
                <p>・表示価格は{store.name}の料金です。</p>
                <p>・混雑時はご希望のお時間に添えない場合がございます。事前予約をおすすめします。</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="luxury-section py-12">
          <div className="mx-auto max-w-4xl space-y-8 px-4">
            <Card className="luxury-panel">
              <CardHeader>
                <CardTitle className="text-xl text-[#f5e6c4]">お支払いについて</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>・各種クレジットカード、電子マネーをご利用いただけます。</p>
                <p>・決済は専門の決済代行サービスを使用し、個人情報は厳重に管理されます。</p>
              </CardContent>
            </Card>
            <Card className="luxury-panel">
              <CardHeader>
                <CardTitle className="text-xl text-[#f5e6c4]">チェンジ・キャンセルについて</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>・ご来店前のキャンセル・変更はお電話で承ります。</p>
                <p>・直前のキャンセルの場合、キャンセル料を頂戴する場合がございます。</p>
              </CardContent>
            </Card>
            <Card className="luxury-panel">
              <CardHeader>
                <CardTitle className="text-xl text-[#f5e6c4]">ご利用時のお願い</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>・過度な飲酒後のご利用は安全のためお断りさせていただきます。</p>
                <p>・暴力行為やセラピストが不快に感じる行為があった場合、即時退店いただきます。</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="border-t border-[#2f2416] bg-[#0f0f0f] py-12">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-4 text-center">
            <h2 className="text-2xl font-semibold text-[#f5e6c4]">ご予約・お問い合わせ</h2>
            <p className="text-sm text-[#d7c39c] md:text-base">
              ご希望の日時が決まりましたら「予約する」ボタン、もしくはお電話でお気軽にご連絡ください。
            </p>
            {normalizedPhone && (
              <a
                href={`tel:${normalizedPhone}`}
                className="inline-flex items-center gap-2 rounded-full bg-[#f6d48a] px-6 py-3 text-lg font-semibold text-[#2b1b0d] shadow-lg hover:bg-[#ffe8bf]"
              >
                <Phone className="h-5 w-5" />
                {store.phone}
              </a>
            )}
            <p className="text-xs text-[#cbb88f]">
              受付時間: {store.openingHours?.weekday?.open ?? '10:00'}〜
              {store.openingHours?.weekday?.close ?? '22:00'}（年中無休）
            </p>
          </div>
        </section>
      </main>

      <StoreFooter store={store} />
    </>
  )
}

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

      <main className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 py-12 text-white">
          <div className="mx-auto max-w-7xl px-4 text-center">
            <h1 className="mb-4 text-4xl font-bold">料金システム</h1>
            <p className="text-xl">わかりやすい料金で安心してご利用いただけます</p>
          </div>
        </div>

        <section className="py-12">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="mb-12 text-center text-3xl font-bold">コース料金</h2>
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
                  <Card key={course.id} className="flex flex-col">
                    <CardHeader className="space-y-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-xl lg:text-2xl">{course.name}</CardTitle>
                        {highlight && <Badge className="bg-emerald-500 text-white">{highlight}</Badge>}
                      </div>
                      {course.description && (
                        <p className="text-sm text-gray-600">{course.description}</p>
                      )}
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col space-y-6">
                      <div className="rounded-lg bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-sm font-medium text-gray-600">
                            <Clock className="h-4 w-4 text-gray-500" />
                            {course.duration}分
                          </span>
                          <span className="text-2xl font-bold text-red-600">
                            ¥{course.price.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <ul className="space-y-2 text-sm text-gray-600">
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

        <section className="bg-white py-12">
          <div className="mx-auto max-w-4xl px-4">
            <h2 className="mb-12 text-center text-3xl font-bold">オプション料金</h2>
            {Object.entries(optionsByCategory).map(([category, categoryOptions]) => (
              <div key={category} className="mb-10">
                <h3 className="mb-4 text-xl font-semibold">
                  {OPTION_CATEGORY_LABELS[category] ?? 'その他オプション'}
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {categoryOptions.map((option) => (
                    <Card
                      key={option.id}
                      className={option.isPopular ? 'relative border-purple-500 shadow-md' : ''}
                    >
                      {option.isPopular && option.note && (
                        <Badge className="absolute -right-2 -top-2 bg-red-500 text-white">
                          {option.note}
                        </Badge>
                      )}
                      <CardContent className="flex h-full flex-col gap-3 p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-lg font-medium">{option.name}</p>
                            {option.description && (
                              <p className="mt-1 text-sm text-gray-600">{option.description}</p>
                            )}
                            {option.duration && (
                              <p className="mt-1 text-sm text-gray-500">
                                <Clock className="mr-1 inline h-3 w-3" />
                                {option.duration}分
                              </p>
                            )}
                          </div>
                          <span
                            className={`ml-4 text-xl font-bold ${
                              option.price === 0 ? 'text-green-600' : 'text-purple-600'
                            }`}
                          >
                            {option.price === 0 ? '無料' : `¥${option.price.toLocaleString()}`}
                          </span>
                        </div>
                        {!option.isPopular && option.note && (
                          <p className="text-xs text-gray-500">{option.note}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="py-12">
          <div className="mx-auto max-w-4xl px-4">
            <h2 className="mb-12 text-center text-3xl font-bold">その他料金</h2>
            <Card>
              <CardContent className="space-y-4 p-8">
                {additionalFees.map((fee, index) => (
                  <div
                    key={fee.id}
                    className={`flex items-center justify-between py-3 ${
                      index < additionalFees.length - 1 ? 'border-b border-gray-200' : ''
                    }`}
                  >
                    <div>
                      <p className="text-lg font-medium">{fee.name}</p>
                      {fee.description && (
                        <p className="text-sm text-gray-600">{fee.description}</p>
                      )}
                    </div>
                    <span className="text-lg font-bold">
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

        <section className="bg-gray-100 py-12">
          <div className="mx-auto max-w-4xl px-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  ご利用にあたって
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {notes.map((note, index) => (
                  <p key={index}>・{note}</p>
                ))}
                <p>・表示価格は{store.name}の料金です。</p>
                <p>・混雑時はご希望のお時間に添えない場合がございます。事前予約をおすすめします。</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="py-12">
          <div className="mx-auto max-w-4xl space-y-8 px-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">お支払いについて</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <p>・各種クレジットカード、電子マネーをご利用いただけます。</p>
                <p>・決済は専門の決済代行サービスを使用し、個人情報は厳重に管理されます。</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">チェンジ・キャンセルについて</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <p>・ご来店前のキャンセル・変更はお電話で承ります。</p>
                <p>・直前のキャンセルの場合、キャンセル料を頂戴する場合がございます。</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">ご利用時のお願い</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <p>・過度な飲酒後のご利用は安全のためお断りさせていただきます。</p>
                <p>・暴力行為やセラピストが不快に感じる行為があった場合、即時退店いただきます。</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="bg-emerald-600 py-12 text-white">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-4 text-center">
            <h2 className="text-2xl font-semibold">ご予約・お問い合わせ</h2>
            <p className="text-sm md:text-base">
              ご希望の日時が決まりましたら「予約する」ボタン、もしくはお電話でお気軽にご連絡ください。
            </p>
            {normalizedPhone && (
              <a
                href={`tel:${normalizedPhone}`}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-lg font-semibold text-emerald-600 shadow-lg hover:bg-gray-100"
              >
                <Phone className="h-5 w-5" />
                {store.phone}
              </a>
            )}
            <p className="text-xs text-emerald-100">
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

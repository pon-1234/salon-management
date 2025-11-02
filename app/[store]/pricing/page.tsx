import { notFound } from 'next/navigation'
import { fetchStoreBySlug } from '@/lib/store/public-api'
import { StoreNavigation } from '@/components/store-navigation'
import { StoreFooter } from '@/components/store-footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Star } from 'lucide-react'
import { getPublicStorePricing } from '@/lib/store/public-pricing'

const DEFAULT_STORE_RATIO = 0.6

export default async function PricingPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: storeSlug } = await params
  const store = await fetchStoreBySlug(storeSlug)

  if (!store) {
    notFound()
  }

  const storePricing = await getPublicStorePricing(store.id)
  const { courses, options, additionalFees, notes } = storePricing
  const sortedCourses = courses.slice().sort((a, b) => a.duration - b.duration || a.price - b.price)

  // Group options by category
  const optionsByCategory = options.reduce(
    (acc, option) => {
      if (!acc[option.category]) {
        acc[option.category] = []
      }
      acc[option.category].push(option)
      return acc
    },
    {} as Record<string, typeof options>
  )

  return (
    <>
      <StoreNavigation />

      <main className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 py-12 text-white">
          <div className="mx-auto max-w-7xl px-4">
            <h1 className="mb-4 text-center text-4xl font-bold">料金システム</h1>
            <p className="text-center text-xl">明瞭な料金体系で安心してご利用いただけます</p>
          </div>
        </div>

        {/* Courses */}
        <section className="py-12">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="mb-12 text-center text-3xl font-bold">コース料金</h2>
            <div className={`grid grid-cols-1 gap-8 ${sortedCourses.length >= 3 ? 'md:grid-cols-3' : sortedCourses.length === 2 ? 'mx-auto max-w-5xl md:grid-cols-2' : ''}`}>
              {sortedCourses.map((course) => (
                <Card key={course.id}>
                  <CardHeader>
                    <CardTitle className="text-center text-xl lg:text-2xl">{course.name}</CardTitle>
                    {course.description && (
                      <p className="mt-2 text-center text-sm text-gray-600">{course.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg bg-gray-50 p-4">
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
                    <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700">
                      <p>
                        店舗取り分: ¥{(course.storeShare ?? Math.round(course.price * DEFAULT_STORE_RATIO)).toLocaleString()}
                      </p>
                      <p>
                        キャスト取り分: ¥{(course.castShare ?? Math.max(course.price - Math.round(course.price * DEFAULT_STORE_RATIO), 0)).toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Options */}
        <section className="bg-white py-12">
          <div className="mx-auto max-w-4xl px-4">
            <h2 className="mb-12 text-center text-3xl font-bold">オプション料金</h2>

            {Object.entries(optionsByCategory).map(([category, categoryOptions]) => (
              <div key={category} className="mb-8">
                <h3 className="mb-4 text-xl font-semibold capitalize">
                  {category === 'special' && '特別オプション'}
                  {category === 'relaxation' && 'リラクゼーション'}
                  {category === 'body-care' && 'ボディケア'}
                  {category === 'extension' && '延長'}
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {categoryOptions.map((option) => (
                    <Card
                      key={option.id}
                      className={option.isPopular ? 'relative border-purple-500 shadow-lg' : ''}
                    >
                      {option.isPopular && option.note && (
                        <Badge className="absolute -right-2 -top-2 bg-red-500">{option.note}</Badge>
                      )}
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <span className="text-lg font-medium">{option.name}</span>
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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Additional Fees */}
        <section className="py-12">
          <div className="mx-auto max-w-4xl px-4">
            <h2 className="mb-12 text-center text-3xl font-bold">その他料金</h2>
            <Card>
              <CardContent className="space-y-4 p-8">
                {additionalFees.map((fee, index) => (
                  <div
                    key={fee.id}
                    className={`flex items-center justify-between py-3 ${
                      index < additionalFees.length - 1 ? 'border-b' : ''
                    }`}
                  >
                    <div>
                      <span className="text-lg">{fee.name}</span>
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

        {/* Notes */}
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
                <p>・表示価格は{store.name}の料金です</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Terms and Conditions */}
        <section className="py-12">
          <div className="mx-auto max-w-4xl space-y-8 px-4">
            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">クレジットカード決済</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">
                  『ご予約完了後、安心の決済代行会社にて決済して頂きます。』
                </p>
                <p className="text-sm text-gray-600">※各種クレジットカード対応可能です。</p>
                <p className="text-sm text-gray-600">
                  ※個人情報取扱は決済代行サービス会社が管理し、当社で取得・管理する事は一切ありません。
                </p>
              </CardContent>
            </Card>

            {/* Change/Cancel Policy */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">チェンジ・キャンセルについて</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  ご返金・ご予約のキャンセル・女性変更につきましては、ホテル入室前であれば可能です。
                </p>
                <p className="mt-2 font-medium text-red-600">
                  ホテル入室後のキャンセルやチェンジは、プレイ開始前であっても一切受付出来ませんので、ご了承下さいませ。
                </p>
              </CardContent>
            </Card>

            {/* Service Exclusions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">サービスに含まれない内容</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <p className="text-red-600">×本番行為</p>
                  <p className="text-red-600">×女性を責める行為</p>
                  <p className="text-red-600">×生フェラ・生スマタ</p>
                  <p className="text-red-600">※その他女性が嫌がる行為</p>
                </div>
              </CardContent>
            </Card>

            {/* Prohibited Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-red-600">禁止事項</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Section 1 */}
                <div>
                  <h4 className="mb-3 font-bold">
                    【1】下記に該当、もしくは疑わしい方の利用を禁止いたします。
                  </h4>
                  <ol className="ml-4 list-inside list-decimal space-y-2">
                    <li>本番要求</li>
                    <li>盗聴盗撮行為</li>
                    <li>窃盗行為</li>
                    <li>薬物（大麻・覚醒剤・シンナー等）を所持、もしくは使用されている方</li>
                  </ol>
                  <p className="mt-3 font-medium text-red-600">
                    万一発見した場合、犯罪行為として所轄警察署に通報させていただきます。
                  </p>
                </div>

                {/* Section 2 */}
                <div>
                  <h4 className="mb-3 font-bold">
                    【2】下記禁止事項に該当した場合サービスを中止し、女性は退出いたします。
                  </h4>
                  <p className="mb-3 text-sm text-gray-600">
                    また下記以外にも当店に相応しくないと判断した場合には、即刻サービスを中止し女性は退出いたします。
                  </p>
                  <ol className="ml-4 list-inside list-decimal space-y-2">
                    <li>サービスにないSM・変態行為等の過剰なサービスの要求</li>
                    <li>スカウト等の引き抜き行為</li>
                    <li>
                      サービスに不適当な部屋・状況での利用
                      <p className="ml-4 mt-1 text-sm text-gray-600">
                        （女性がお部屋にうかがいましたら、サービスの前に一緒にシャワーをお使いいただき、うがいも行ってください。）
                      </p>
                    </li>
                    <li>つめが伸びている、不潔である等衛生上好ましくない方</li>
                    <li>第三者がいる、またはプレイ途中にいらっしゃった場合</li>
                    <li>暴力団関係者、またはそれに準ずる方</li>
                    <li>泥酔状態の方</li>
                    <li>性病・その他の伝染病に感染している方、または疑わしき方</li>
                    <li>女性に対する暴言・暴力等があった場合</li>
                    <li>頻繁にご予約をキャンセルされた方</li>
                    <li>店を通さずに会おうとした、または会った方</li>
                  </ol>
                </div>

                <div className="border-t pt-4">
                  <p className="text-center font-medium">
                    上記項目をご理解いただいた上で当店をご利用いただきますようお願い申し上げます。
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <StoreFooter store={store} />
      </main>
    </>
  )
}

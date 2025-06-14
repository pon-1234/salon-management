import { notFound } from 'next/navigation'
import { getStoreBySlug } from '@/lib/store/data'
import { StoreNavigation } from '@/components/store-navigation'
import { StoreFooter } from '@/components/store-footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Star, Clock } from 'lucide-react'
import { getPricingUseCases } from '@/lib/pricing'

export default async function PricingPage({ 
  params 
}: { 
  params: Promise<{ store: string }> 
}) {
  const { store: storeSlug } = await params
  const store = getStoreBySlug(storeSlug)

  if (!store) {
    notFound()
  }

  // Get pricing data from the centralized pricing system
  const pricingUseCases = getPricingUseCases()
  const storePricing = await pricingUseCases.getStorePricing(store.id)
  const { courses, options, additionalFees, notes } = storePricing

  // Group options by category
  const optionsByCategory = options.reduce((acc, option) => {
    if (!acc[option.category]) {
      acc[option.category] = []
    }
    acc[option.category].push(option)
    return acc
  }, {} as Record<string, typeof options>)

  return (
    <>
      <StoreNavigation />
      
      <main className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-12">
          <div className="max-w-7xl mx-auto px-4">
            <h1 className="text-4xl font-bold text-center mb-4">料金システム</h1>
            <p className="text-center text-xl">明瞭な料金体系で安心してご利用いただけます</p>
          </div>
        </div>

        {/* Courses */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">コース料金</h2>
            <div className={`grid grid-cols-1 gap-8 ${
              courses.length === 2 
                ? 'md:grid-cols-2 max-w-5xl mx-auto' 
                : courses.length >= 3 
                ? 'md:grid-cols-3' 
                : ''
            }`}>
              {courses.map((course) => (
                <Card key={course.id} className={course.isPopular ? 'border-purple-500 shadow-xl relative' : ''}>
                  {course.isPopular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600">
                      人気No.1
                    </Badge>
                  )}
                  <CardHeader>
                    <CardTitle className="text-xl lg:text-2xl text-center">
                      {course.name}
                    </CardTitle>
                    {course.description && (
                      <p className="text-sm text-gray-600 text-center mt-2">
                        {course.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      {course.durations.map((duration) => (
                        <div key={duration.time} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-500" />
                              {duration.time}分
                              {duration.label && (
                                <Badge variant="secondary" className="text-xs">
                                  {duration.label}
                                </Badge>
                              )}
                            </span>
                            <div className="text-right">
                              {duration.originalPrice && (
                                <span className="text-sm text-gray-400 line-through block">
                                  ¥{duration.originalPrice.toLocaleString()}
                                </span>
                              )}
                              <span className="font-bold text-lg text-red-600">
                                ¥{duration.price.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {course.features.map((feature) => (
                        <div key={feature} className="flex items-start gap-2">
                          <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                    {course.notes && course.notes.length > 0 && (
                      <div className="pt-3 border-t space-y-1">
                        {course.notes.map((note, index) => (
                          <p key={index} className="text-xs text-gray-600">※ {note}</p>
                        ))}
                      </div>
                    )}
                    {course.recommendedDuration && (
                      <div className="bg-yellow-50 p-3 rounded-lg">
                        <p className="text-sm text-yellow-800 font-medium text-center">
                          おすすめ: {course.recommendedDuration}分コース
                        </p>
                      </div>
                    )}
                    {course.targetAudience && (
                      <p className="text-sm text-gray-600 text-center font-medium">
                        {course.targetAudience}
                      </p>
                    )}
                    {course.pointUsage && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-xs font-semibold text-blue-800 mb-2">ポイント利用可能</p>
                        <div className="space-y-1">
                          {Object.entries(course.pointUsage).map(([duration, points]) => (
                            <p key={duration} className="text-xs text-blue-700">
                              {duration}分: {points.toLocaleString()}pt
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Options */}
        <section className="py-12 bg-white">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">オプション料金</h2>
            
            {Object.entries(optionsByCategory).map(([category, categoryOptions]) => (
              <div key={category} className="mb-8">
                <h3 className="text-xl font-semibold mb-4 capitalize">
                  {category === 'special' && '特別オプション'}
                  {category === 'relaxation' && 'リラクゼーション'}
                  {category === 'body-care' && 'ボディケア'}
                  {category === 'extension' && '延長'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categoryOptions.map((option) => (
                    <Card key={option.id} className={option.isPopular ? 'border-purple-500 shadow-lg relative' : ''}>
                      {option.isPopular && option.note && (
                        <Badge className="absolute -top-2 -right-2 bg-red-500">
                          {option.note}
                        </Badge>
                      )}
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <span className="text-lg font-medium">{option.name}</span>
                            {option.description && (
                              <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                            )}
                            {option.duration && (
                              <p className="text-sm text-gray-500 mt-1">
                                <Clock className="inline h-3 w-3 mr-1" />
                                {option.duration}分
                              </p>
                            )}
                          </div>
                          <span className={`text-xl font-bold ml-4 ${
                            option.price === 0 ? 'text-green-600' : 'text-purple-600'
                          }`}>
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
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">その他料金</h2>
            <Card>
              <CardContent className="p-8 space-y-4">
                {additionalFees.map((fee, index) => (
                  <div key={fee.id} className={`flex justify-between items-center py-3 ${
                    index < additionalFees.length - 1 ? 'border-b' : ''
                  }`}>
                    <div>
                      <span className="text-lg">{fee.name}</span>
                      {fee.description && (
                        <p className="text-sm text-gray-600">{fee.description}</p>
                      )}
                    </div>
                    <span className="text-lg font-bold">
                      {fee.type === 'fixed' && `¥${(fee.value as number).toLocaleString()}`}
                      {fee.type === 'percentage' && `${fee.value}%増`}
                      {fee.type === 'range' && typeof fee.value === 'object' && (
                        `¥${fee.value.min.toLocaleString()}〜¥${fee.value.max.toLocaleString()}`
                      )}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Notes */}
        <section className="py-12 bg-gray-100">
          <div className="max-w-4xl mx-auto px-4">
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
          <div className="max-w-4xl mx-auto px-4 space-y-8">
            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">クレジットカード決済</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">『ご予約完了後、安心の決済代行会社にて決済して頂きます。』</p>
                <p className="text-sm text-gray-600">※各種クレジットカード対応可能です。</p>
                <p className="text-sm text-gray-600">※個人情報取扱は決済代行サービス会社が管理し、当社で取得・管理する事は一切ありません。</p>
              </CardContent>
            </Card>

            {/* Change/Cancel Policy */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">チェンジ・キャンセルについて</CardTitle>
              </CardHeader>
              <CardContent>
                <p>ご返金・ご予約のキャンセル・女性変更につきましては、ホテル入室前であれば可能です。</p>
                <p className="text-red-600 font-medium mt-2">ホテル入室後のキャンセルやチェンジは、プレイ開始前であっても一切受付出来ませんので、ご了承下さいませ。</p>
              </CardContent>
            </Card>

            {/* Service Exclusions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">サービスに含まれない内容</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                  <h4 className="font-bold mb-3">【1】下記に該当、もしくは疑わしい方の利用を禁止いたします。</h4>
                  <ol className="list-decimal list-inside space-y-2 ml-4">
                    <li>本番要求</li>
                    <li>盗聴盗撮行為</li>
                    <li>窃盗行為</li>
                    <li>薬物（大麻・覚醒剤・シンナー等）を所持、もしくは使用されている方</li>
                  </ol>
                  <p className="text-red-600 font-medium mt-3">万一発見した場合、犯罪行為として所轄警察署に通報させていただきます。</p>
                </div>

                {/* Section 2 */}
                <div>
                  <h4 className="font-bold mb-3">【2】下記禁止事項に該当した場合サービスを中止し、女性は退出いたします。</h4>
                  <p className="text-sm text-gray-600 mb-3">また下記以外にも当店に相応しくないと判断した場合には、即刻サービスを中止し女性は退出いたします。</p>
                  <ol className="list-decimal list-inside space-y-2 ml-4">
                    <li>サービスにないSM・変態行為等の過剰なサービスの要求</li>
                    <li>スカウト等の引き抜き行為</li>
                    <li>サービスに不適当な部屋・状況での利用
                      <p className="text-sm text-gray-600 mt-1 ml-4">（女性がお部屋にうかがいましたら、サービスの前に一緒にシャワーをお使いいただき、うがいも行ってください。）</p>
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
                  <p className="text-center font-medium">上記項目をご理解いただいた上で当店をご利用いただきますようお願い申し上げます。</p>
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
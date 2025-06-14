import { notFound } from 'next/navigation'
import { getStoreBySlug } from '@/lib/store/data'
import { StoreNavigation } from '@/components/store-navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Star, Clock } from 'lucide-react'

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

  const courses = [
    {
      name: 'スタンダードコース',
      durations: [
        { time: 60, price: 12000 },
        { time: 90, price: 18000 },
        { time: 120, price: 24000 },
      ],
      features: [
        '基本睾丸マッサージ',
        'パウダーマッサージ',
        '全身マッサージ',
        '上半身リップサービス',
      ]
    },
    {
      name: 'プレミアムコース',
      popular: true,
      durations: [
        { time: 90, price: 25000 },
        { time: 120, price: 32000 },
        { time: 150, price: 40000 },
      ],
      features: [
        '本格睾丸マッサージ',
        'オイルマッサージ',
        '密着フェザータッチ',
        '鼠径部回春マッサージ',
        '全身密着泡洗体',
        'トップレスサービス',
      ]
    },
    {
      name: 'VIPコース',
      durations: [
        { time: 120, price: 45000 },
        { time: 150, price: 55000 },
        { time: 180, price: 65000 },
      ],
      features: [
        'プレミアムコースの全内容',
        '特別オプション無料',
        '指名料無料',
        'VIPルーム確約',
        'ドリンクサービス',
      ]
    }
  ]

  const options = [
    { name: 'オールヌード', price: 3000 },
    { name: 'ローション追加', price: 2000 },
    { name: 'コスプレ', price: 2000 },
    { name: '延長30分', price: 8000 },
  ]

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {courses.map((course) => (
                <Card key={course.name} className={course.popular ? 'border-purple-500 shadow-xl relative' : ''}>
                  {course.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600">
                      人気No.1
                    </Badge>
                  )}
                  <CardHeader>
                    <CardTitle className="text-2xl text-center">
                      {course.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      {course.durations.map((duration) => (
                        <div key={duration.time} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            {duration.time}分
                          </span>
                          <span className="font-bold text-lg">¥{duration.price.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {course.features.map((feature) => (
                        <div key={feature} className="flex items-start gap-2">
                          <Check className="h-5 w-5 text-green-500 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {options.map((option) => (
                <Card key={option.name}>
                  <CardContent className="p-6 flex justify-between items-center">
                    <span className="text-lg font-medium">{option.name}</span>
                    <span className="text-xl font-bold text-purple-600">¥{option.price.toLocaleString()}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Additional Fees */}
        <section className="py-12">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">その他料金</h2>
            <Card>
              <CardContent className="p-8 space-y-4">
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-lg">指名料</span>
                  <span className="text-lg font-bold">¥2,000〜¥5,000</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-lg">交通費</span>
                  <span className="text-lg font-bold">エリアにより変動</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-lg">深夜料金（22:00以降）</span>
                  <span className="text-lg font-bold">20%増</span>
                </div>
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
                <p>・料金は全て税込価格です</p>
                <p>・お支払いは現金のみとなります</p>
                <p>・キャンセル料: 当日キャンセルは料金の50%</p>
                <p>・ご予約は10分単位で承ります</p>
                <p>・表示価格は{store.name}の料金です</p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </>
  )
}
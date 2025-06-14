import { notFound } from 'next/navigation'
import { getStoreBySlug } from '@/lib/store/data'
import { StoreNavigation } from '@/components/store-navigation'
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {courses.map((course) => (
                <Card key={course.id} className={course.isPopular ? 'border-purple-500 shadow-xl relative' : ''}>
                  {course.isPopular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600">
                      人気No.1
                    </Badge>
                  )}
                  <CardHeader>
                    <CardTitle className="text-2xl text-center">
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
                    {course.targetAudience && (
                      <p className="text-sm text-gray-600 pt-2 border-t">
                        {course.targetAudience}
                      </p>
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
                    <Card key={option.id}>
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
                          <span className="text-xl font-bold text-purple-600 ml-4">
                            ¥{option.price.toLocaleString()}
                          </span>
                        </div>
                        {option.note && (
                          <p className="text-xs text-gray-500 mt-2">{option.note}</p>
                        )}
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
      </main>
    </>
  )
}
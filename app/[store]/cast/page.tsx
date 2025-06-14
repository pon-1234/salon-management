import { notFound } from 'next/navigation'
import { getStoreBySlug } from '@/lib/store/data'
import { StoreNavigation } from '@/components/store-navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, Heart, Crown } from 'lucide-react'
import Link from 'next/link'

export default async function CastListPage({ 
  params 
}: { 
  params: Promise<{ store: string }> 
}) {
  const { store: storeSlug } = await params
  const store = getStoreBySlug(storeSlug)

  if (!store) {
    notFound()
  }

  // Mock cast data - in real app, this would come from database
  const casts = [
    {
      id: '1',
      name: 'ことね',
      age: 27,
      height: 158,
      measurements: { bust: 95, cup: 'G', waist: 63, hip: 97 },
      rank: 1,
      isNew: false,
      rating: 4.8,
      reviews: 156,
      tags: ['巨乳', '人気No.1', 'リピート率高'],
      schedule: '出勤中'
    },
    {
      id: '2',
      name: 'ののか',
      age: 31,
      height: 160,
      measurements: { bust: 84, cup: 'F', waist: 60, hip: 85 },
      rank: 2,
      isNew: false,
      rating: 4.7,
      reviews: 132,
      tags: ['テクニシャン', '癒し系'],
      schedule: '出勤中'
    },
    {
      id: '3',
      name: 'みるく',
      age: 20,
      height: 160,
      measurements: { bust: 96, cup: 'G', waist: 62, hip: 98 },
      rank: 3,
      isNew: true,
      rating: 4.9,
      reviews: 45,
      tags: ['新人', '巨乳', '笑顔が素敵'],
      schedule: '15:00-23:00'
    },
    // Add more cast members...
  ]

  return (
    <>
      <StoreNavigation />
      
      <main className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-12">
          <div className="max-w-7xl mx-auto px-4">
            <h1 className="text-4xl font-bold text-center mb-4">在籍一覧</h1>
            <p className="text-center text-xl">{store.name}の魅力的なキャスト</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow-sm sticky top-16 z-40">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm">すべて</Button>
              <Button variant="outline" size="sm">新人</Button>
              <Button variant="outline" size="sm">本日出勤</Button>
              <Button variant="outline" size="sm">巨乳</Button>
              <Button variant="outline" size="sm">スレンダー</Button>
              <Button variant="outline" size="sm">20代</Button>
              <Button variant="outline" size="sm">30代</Button>
            </div>
          </div>
        </div>

        {/* Cast Grid */}
        <section className="py-8">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {casts.map((cast) => (
                <Card key={cast.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="p-4 pb-2">
                    <div className="relative">
                      <div className="aspect-[3/4] bg-gradient-to-br from-pink-300 to-purple-400 rounded-lg mb-3" />
                      {cast.rank <= 3 && (
                        <Badge className={`absolute top-2 left-2 ${
                          cast.rank === 1 ? 'bg-yellow-500' : 
                          cast.rank === 2 ? 'bg-gray-400' : 'bg-orange-600'
                        }`}>
                          <Crown className="h-3 w-3 mr-1" />
                          {cast.rank}位
                        </Badge>
                      )}
                      {cast.isNew && (
                        <Badge className="absolute top-2 right-2 bg-pink-500">
                          NEW
                        </Badge>
                      )}
                      {cast.schedule === '出勤中' && (
                        <Badge className="absolute bottom-2 left-2 bg-green-500">
                          出勤中
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3">
                    <div>
                      <h3 className="font-bold text-lg">{cast.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {cast.age}歳 T{cast.height}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        B{cast.measurements.bust}({cast.measurements.cup}) W{cast.measurements.waist} H{cast.measurements.hip}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{cast.rating}</span>
                        <span className="text-xs text-muted-foreground">({cast.reviews})</span>
                      </div>
                      <Heart className="h-4 w-4 text-pink-400" />
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {cast.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="pt-2 space-y-2">
                      <Button asChild className="w-full" size="sm">
                        <Link href={`/${store.slug}/cast/${cast.id}`}>
                          詳細を見る
                        </Link>
                      </Button>
                      <Button asChild variant="outline" className="w-full" size="sm">
                        <Link href={`/${store.slug}/booking?cast=${cast.id}`}>
                          予約する
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pagination */}
        <div className="py-8">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm">前へ</Button>
              <Button variant="outline" size="sm">1</Button>
              <Button variant="default" size="sm">2</Button>
              <Button variant="outline" size="sm">3</Button>
              <Button variant="outline" size="sm">次へ</Button>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
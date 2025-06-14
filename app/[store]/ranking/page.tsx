import { notFound } from 'next/navigation'
import { getStoreBySlug } from '@/lib/store/data'
import { StoreNavigation } from '@/components/store-navigation'
import { StoreFooter } from '@/components/store-footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Crown, TrendingUp, Star, Heart, MessageSquare, Calendar } from 'lucide-react'
import Link from 'next/link'

export default async function RankingPage({ 
  params 
}: { 
  params: Promise<{ store: string }> 
}) {
  const { store: storeSlug } = await params
  const store = getStoreBySlug(storeSlug)

  if (!store) {
    notFound()
  }

  // Mock ranking data
  const rankings = {
    overall: [
      { rank: 1, name: 'ことね', age: 27, size: 'T158 B95(G) W63 H97', points: 2450, trend: 'up' },
      { rank: 2, name: 'ののか', age: 31, size: 'T160 B84(F) W60 H85', points: 2320, trend: 'same' },
      { rank: 3, name: 'みるく', age: 20, size: 'T160 B96(G) W62 H98', points: 2180, trend: 'up' },
      { rank: 4, name: 'すずか', age: 29, size: 'T155 B93(F) W58 H90', points: 1950, trend: 'down' },
      { rank: 5, name: 'ゆり', age: 25, size: 'T160 B83(C) W57 H84', points: 1820, trend: 'up' },
    ],
    new: [
      { rank: 1, name: 'みるく', age: 20, size: 'T160 B96(G) W62 H98', joinDate: '2024-05-15' },
      { rank: 2, name: 'ひかる', age: 28, size: 'T156 B83(D) W57 H82', joinDate: '2024-05-20' },
      { rank: 3, name: 'せな', age: 32, size: 'T157 B84(E) W57 H83', joinDate: '2024-05-25' },
    ],
    review: [
      { rank: 1, name: 'ことね', rating: 4.9, reviews: 156 },
      { rank: 2, name: 'みるく', rating: 4.8, reviews: 45 },
      { rank: 3, name: 'ののか', rating: 4.7, reviews: 132 },
    ],
    repeat: [
      { rank: 1, name: 'すずか', rate: 78 },
      { rank: 2, name: 'ことね', rate: 75 },
      { rank: 3, name: 'ののか', rate: 72 },
    ]
  }

  const getRankBadgeColor = (rank: number) => {
    switch(rank) {
      case 1: return 'bg-yellow-500'
      case 2: return 'bg-gray-400'
      case 3: return 'bg-orange-600'
      default: return 'bg-gray-600'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch(trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down': return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
      default: return <span className="text-gray-400">→</span>
    }
  }

  return (
    <>
      <StoreNavigation />
      
      <main className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-12">
          <div className="max-w-7xl mx-auto px-4">
            <h1 className="text-4xl font-bold text-center mb-4 flex items-center justify-center gap-3">
              <Crown className="h-10 w-10 text-yellow-300" />
              ランキング
            </h1>
            <p className="text-center text-xl">{store.name}の人気キャストランキング</p>
          </div>
        </div>

        {/* Rankings */}
        <section className="py-8">
          <div className="max-w-7xl mx-auto px-4">
            <Tabs defaultValue="overall" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto">
                <TabsTrigger value="overall">総合</TabsTrigger>
                <TabsTrigger value="new">新人</TabsTrigger>
                <TabsTrigger value="review">口コミ</TabsTrigger>
                <TabsTrigger value="repeat">リピート</TabsTrigger>
              </TabsList>

              <TabsContent value="overall" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>総合ランキング TOP5</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {rankings.overall.map((cast) => (
                      <div key={cast.rank} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <Badge className={`text-lg px-4 py-2 ${getRankBadgeColor(cast.rank)}`}>
                          {cast.rank}
                        </Badge>
                        <div className="w-16 h-16 bg-gradient-to-br from-pink-300 to-purple-400 rounded-lg flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">{cast.name}</h3>
                          <p className="text-sm text-muted-foreground">{cast.age}歳 {cast.size}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-medium">{cast.points}pt</span>
                            {getTrendIcon(cast.trend)}
                          </div>
                        </div>
                        <Button asChild>
                          <Link href={`/${store.slug}/cast/${cast.rank}`}>
                            詳細を見る
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="new" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>新人ランキング</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {rankings.new.map((cast) => (
                      <div key={cast.rank} className="flex items-center gap-4 p-4 bg-pink-50 rounded-lg hover:bg-pink-100 transition-colors">
                        <Badge className={`text-lg px-4 py-2 ${getRankBadgeColor(cast.rank)}`}>
                          {cast.rank}
                        </Badge>
                        <div className="w-16 h-16 bg-gradient-to-br from-pink-300 to-purple-400 rounded-lg flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">{cast.name}</h3>
                          <p className="text-sm text-muted-foreground">{cast.age}歳 {cast.size}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">入店日: {cast.joinDate}</span>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-pink-200">NEW</Badge>
                        <Button asChild>
                          <Link href={`/${store.slug}/cast/${cast.rank}`}>
                            詳細を見る
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="review" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>口コミ評価ランキング</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {rankings.review.map((cast) => (
                      <div key={cast.rank} className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                        <Badge className={`text-lg px-4 py-2 ${getRankBadgeColor(cast.rank)}`}>
                          {cast.rank}
                        </Badge>
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-300 to-purple-400 rounded-lg flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">{cast.name}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium">{cast.rating}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-muted-foreground">{cast.reviews}件</span>
                            </div>
                          </div>
                        </div>
                        <Button asChild>
                          <Link href={`/${store.slug}/reviews?cast=${cast.name}`}>
                            口コミを見る
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="repeat" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>リピート率ランキング</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {rankings.repeat.map((cast) => (
                      <div key={cast.rank} className="flex items-center gap-4 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                        <Badge className={`text-lg px-4 py-2 ${getRankBadgeColor(cast.rank)}`}>
                          {cast.rank}
                        </Badge>
                        <div className="w-16 h-16 bg-gradient-to-br from-green-300 to-purple-400 rounded-lg flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">{cast.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Heart className="h-4 w-4 text-red-500" />
                            <span className="font-medium text-green-700">リピート率 {cast.rate}%</span>
                          </div>
                        </div>
                        <Button asChild>
                          <Link href={`/${store.slug}/cast/${cast.rank}`}>
                            詳細を見る
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </section>
        
        <StoreFooter store={store} />
      </main>
    </>
  )
}
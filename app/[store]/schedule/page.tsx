import { notFound } from 'next/navigation'
import { getStoreBySlug } from '@/lib/store/data'
import { StoreNavigation } from '@/components/store-navigation'
import { StoreFooter } from '@/components/store-footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, User } from 'lucide-react'
import Link from 'next/link'
import { format, addDays, startOfWeek } from 'date-fns'
import { ja } from 'date-fns/locale'

export default async function SchedulePage({ params }: { params: Promise<{ store: string }> }) {
  const { store: storeSlug } = await params
  const store = getStoreBySlug(storeSlug)

  if (!store) {
    notFound()
  }

  // Generate week dates
  const today = new Date()
  const weekStart = startOfWeek(today, { locale: ja })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Mock schedule data
  const scheduleData: Record<
    string,
    Array<{ castId: string; name: string; time: string; status: string }>
  > = {
    '2024-06-08': [
      { castId: '1', name: 'ことね', time: '10:00-19:00', status: 'available' },
      { castId: '2', name: 'ののか', time: '12:00-21:00', status: 'available' },
      { castId: '3', name: 'みるく', time: '15:00-23:00', status: 'available' },
      { castId: '4', name: 'すずか', time: '10:00-18:00', status: 'limited' },
    ],
    // Add more dates...
  }

  const getTodaySchedule = () => {
    const todayKey = format(today, 'yyyy-MM-dd')
    return scheduleData[todayKey] || []
  }

  return (
    <>
      <StoreNavigation />

      <main className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 py-12 text-white">
          <div className="mx-auto max-w-7xl px-4">
            <h1 className="mb-4 text-center text-4xl font-bold">出勤一覧</h1>
            <p className="text-center text-xl">{store.name}の出勤スケジュール</p>
          </div>
        </div>

        {/* Calendar View */}
        <section className="py-8">
          <div className="mx-auto max-w-7xl px-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  週間スケジュール
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((date, index) => {
                    const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
                    return (
                      <Button
                        key={index}
                        variant={isToday ? 'default' : 'outline'}
                        className="flex h-auto flex-col py-3"
                      >
                        <span className="text-xs">{format(date, 'E', { locale: ja })}</span>
                        <span className="text-lg font-bold">{format(date, 'd')}</span>
                      </Button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Today's Schedule */}
        <section className="py-8">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold">
              <Clock className="h-6 w-6" />
              本日の出勤 ({format(today, 'MM月dd日')})
            </h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {getTodaySchedule().map((schedule: any) => (
                <Card key={schedule.castId} className="transition-shadow hover:shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="h-20 w-20 flex-shrink-0 rounded-lg bg-gradient-to-br from-pink-300 to-purple-400" />
                      <div className="flex-1 space-y-2">
                        <h3 className="text-lg font-bold">{schedule.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {schedule.time}
                        </div>
                        <Badge
                          variant={schedule.status === 'available' ? 'default' : 'secondary'}
                          className={schedule.status === 'available' ? 'bg-green-500' : ''}
                        >
                          {schedule.status === 'available' ? '予約可' : '残りわずか'}
                        </Badge>
                        <div className="pt-2">
                          <Button asChild size="sm" className="w-full">
                            <Link href={`/${store.slug}/booking?cast=${schedule.castId}`}>
                              予約する
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {getTodaySchedule().length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <User className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <p className="text-lg text-muted-foreground">
                    本日の出勤情報はまだ登録されていません
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        {/* Weekly Overview */}
        <section className="py-8">
          <div className="mx-auto max-w-7xl px-4">
            <Card>
              <CardHeader>
                <CardTitle>今週の出勤予定</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="p-2 text-left">キャスト</th>
                        {weekDays.map((date, index) => (
                          <th key={index} className="min-w-[80px] p-2 text-center">
                            <div className="text-xs text-muted-foreground">
                              {format(date, 'E', { locale: ja })}
                            </div>
                            <div className="font-medium">{format(date, 'd')}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {['ことね', 'ののか', 'みるく', 'すずか'].map((castName) => (
                        <tr key={castName} className="border-b">
                          <td className="p-2 font-medium">{castName}</td>
                          {weekDays.map((_, index) => (
                            <td key={index} className="p-2 text-center">
                              {index === 0 || index === 2 || index === 4 ? (
                                <Badge variant="outline" className="text-xs">
                                  10-19
                                </Badge>
                              ) : index === 1 || index === 5 ? (
                                <Badge variant="outline" className="text-xs">
                                  15-23
                                </Badge>
                              ) : (
                                <span className="text-gray-400">休</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
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

'use client'

import { Store } from '@/lib/store/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, MapPin, User, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface ReservationHistoryProps {
  store: Store
}

export function ReservationHistory({ store }: ReservationHistoryProps) {
  // Mock reservation data
  const reservations = [
    {
      id: '1',
      date: new Date('2024-06-10'),
      castName: 'すずか',
      course: '120分オススメコース',
      options: ['オールヌード', '回春増し増し'],
      status: 'completed' as const,
      price: 34000,
      location: '池袋（北口・西口）',
      hasReview: true,
    },
    {
      id: '2',
      date: new Date('2024-05-28'),
      castName: 'みるく',
      course: '90分コース',
      options: ['密着洗髪スパ'],
      status: 'completed' as const,
      price: 19000,
      location: '池袋（東口）',
      hasReview: false,
    },
    {
      id: '3',
      date: new Date('2024-06-20'),
      castName: 'ののか',
      course: '130分人気No.1コース',
      options: ['オールヌード'],
      status: 'confirmed' as const,
      price: 33000,
      location: '池袋（北口・西口）',
      hasReview: false,
    },
    {
      id: '4',
      date: new Date('2024-04-15'),
      castName: 'さくら',
      course: '70分お試しフリー限定',
      options: [],
      status: 'cancelled' as const,
      price: 13000,
      location: '池袋（南口）',
      hasReview: false,
    },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-500">予約確定</Badge>
      case 'completed':
        return <Badge variant="secondary">利用済み</Badge>
      case 'cancelled':
        return <Badge variant="destructive">キャンセル</Badge>
      default:
        return null
    }
  }

  const upcomingReservations = reservations.filter(r => r.status === 'confirmed')
  const pastReservations = reservations.filter(r => r.status !== 'confirmed')

  return (
    <div className="space-y-6">
      {/* Upcoming Reservations */}
      {upcomingReservations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">予約中</h3>
          <div className="space-y-4">
            {upcomingReservations.map((reservation) => (
              <Card key={reservation.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(reservation.status)}
                      <span className="text-sm text-gray-500">
                        予約番号: {reservation.id}
                      </span>
                    </div>
                    <span className="text-lg font-bold">
                      ¥{reservation.price.toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{format(reservation.date, 'yyyy年MM月dd日（E）', { locale: ja })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>{reservation.course}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-gray-400" />
                        <span>{reservation.castName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span>{reservation.location}</span>
                      </div>
                    </div>
                  </div>

                  {reservation.options.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {reservation.options.map((option) => (
                        <Badge key={option} variant="outline">
                          {option}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      予約変更
                    </Button>
                    <Button variant="outline" className="flex-1 text-red-600 hover:text-red-700">
                      キャンセル
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Past Reservations */}
      <div>
        <h3 className="text-lg font-semibold mb-4">利用履歴</h3>
        <div className="space-y-4">
          {pastReservations.map((reservation) => (
            <Card key={reservation.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(reservation.status)}
                    <span className="text-sm text-gray-500">
                      {format(reservation.date, 'yyyy年MM月dd日', { locale: ja })}
                    </span>
                  </div>
                  <span className="text-lg font-bold">
                    ¥{reservation.price.toLocaleString()}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{reservation.castName}</span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-600">{reservation.course}</span>
                  </div>
                  {reservation.options.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {reservation.options.map((option) => (
                        <Badge key={option} variant="outline" className="text-xs">
                          {option}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {reservation.status === 'completed' && (
                  <div className="flex gap-2">
                    {!reservation.hasReview ? (
                      <Button variant="outline" size="sm" className="flex-1">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        口コミを書く
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" disabled className="flex-1">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        口コミ投稿済み
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="flex-1">
                      再予約
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {reservations.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-4">まだ予約履歴がありません</p>
            <Button asChild>
              <a href={`/${store.slug}/cast`}>キャストを見る</a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
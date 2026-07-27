/**
 * @design_doc   Customer MyPage reservation history backed by the authenticated reservation API
 * @related_to   app/api/reservation/route.ts; lib/http/customer-dto.ts; MyPageContent
 * @known_issues Review submission and rebooking actions are outside this read-only history view
 */
'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Calendar, Clock, MapPin, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { buildStoreReservationEndpoint } from '@/lib/reservation/endpoints'
import type { Store } from '@/lib/store/types'

interface ReservationHistoryProps {
  store: Store
}

interface CustomerReservation {
  id: string
  startTime: Date
  endTime: Date
  status: string
  price: number
  castName: string
  courseName: string
  optionNames: string[]
  location: string
}

type UnknownRecord = Record<string, unknown>

const UPCOMING_STATUSES = new Set(['confirmed', 'pending', 'modifiable'])

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  return value as UnknownRecord
}

function readString(source: UnknownRecord | null, key: string): string | null {
  const value = source?.[key]
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function readRelationName(source: UnknownRecord, relation: string): string | null {
  return readString(asRecord(source[relation]), 'name')
}

function readOptionNames(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((entry) => {
    const option = asRecord(entry)
    const name = readString(option, 'optionName') ?? readRelationName(option ?? {}, 'option')
    return name ? [name] : []
  })
}

function normalizeReservation(value: unknown, store: Store): CustomerReservation | null {
  const source = asRecord(value)
  const id = readString(source, 'id')
  const storeId = readString(source, 'storeId')
  const startTimeValue = readString(source, 'startTime')
  const endTimeValue = readString(source, 'endTime')
  const status = readString(source, 'status')

  if (!source || !id || storeId !== store.id || !startTimeValue || !endTimeValue || !status) {
    return null
  }

  const startTime = new Date(startTimeValue)
  const endTime = new Date(endTimeValue)
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    return null
  }

  const rawPrice = source.price
  const price = typeof rawPrice === 'number' && Number.isFinite(rawPrice) ? rawPrice : 0
  const location =
    readString(source, 'locationMemo') ??
    readString(source, 'hotelName') ??
    readRelationName(source, 'station') ??
    readRelationName(source, 'area') ??
    store.displayName

  return {
    id,
    startTime,
    endTime,
    status,
    price,
    castName: readRelationName(source, 'cast') ?? 'キャスト未定',
    courseName: readRelationName(source, 'course') ?? 'コース情報なし',
    optionNames: readOptionNames(source.options),
    location,
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'confirmed':
      return <Badge className="bg-green-500">予約確定</Badge>
    case 'pending':
      return <Badge className="bg-amber-500">予約受付中</Badge>
    case 'modifiable':
      return <Badge className="bg-blue-500">店舗確認中</Badge>
    case 'completed':
      return <Badge variant="secondary">利用済み</Badge>
    case 'cancelled':
      return <Badge variant="destructive">キャンセル</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function ReservationCard({ reservation }: { reservation: CustomerReservation }) {
  return (
    <Card role="article" aria-label={`予約 ${reservation.id}`}>
      <CardContent className="p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {getStatusBadge(reservation.status)}
            <span className="text-sm text-gray-500">予約番号: {reservation.id}</span>
          </div>
          <span className="whitespace-nowrap text-lg font-bold">
            ¥{reservation.price.toLocaleString('ja-JP')}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-gray-400" aria-hidden="true" />
            <span>{format(reservation.startTime, 'yyyy年MM月dd日（E）', { locale: ja })}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-gray-400" aria-hidden="true" />
            <span>
              {format(reservation.startTime, 'HH:mm')}〜{format(reservation.endTime, 'HH:mm')}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-gray-400" aria-hidden="true" />
            <span>{reservation.castName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-gray-400" aria-hidden="true" />
            <span>{reservation.location}</span>
          </div>
        </div>

        <p className="mt-3 text-sm font-medium">{reservation.courseName}</p>
        {reservation.optionNames.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {reservation.optionNames.map((optionName) => (
              <Badge key={optionName} variant="outline">
                {optionName}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ReservationHistory({ store }: ReservationHistoryProps) {
  const [reservations, setReservations] = useState<CustomerReservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const loadReservations = async () => {
      setLoading(true)
      setError(null)
      setReservations([])

      try {
        const endpoint = `${buildStoreReservationEndpoint(store.id)}&sortBy=startTime&sortOrder=desc`
        const response = await fetch(endpoint, {
          credentials: 'include',
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error('予約履歴の取得に失敗しました')
        }

        const payload: unknown = await response.json()
        if (!Array.isArray(payload)) {
          throw new Error('予約履歴の取得に失敗しました')
        }

        const normalized = payload
          .map((entry) => normalizeReservation(entry, store))
          .filter((entry): entry is CustomerReservation => entry !== null)
          .sort((left, right) => right.startTime.getTime() - left.startTime.getTime())

        if (active) {
          setReservations(normalized)
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : '予約履歴の取得に失敗しました')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadReservations()
    return () => {
      active = false
    }
  }, [store])

  if (loading) {
    return (
      <Card>
        <CardContent role="status" className="py-12 text-center text-gray-500">
          予約履歴を読み込んでいます
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-12 text-center text-red-600">
          {error}
        </CardContent>
      </Card>
    )
  }

  if (reservations.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="mb-4 text-gray-500">まだ予約履歴がありません</p>
          <Button asChild>
            <a href={`/${store.slug}/cast`}>キャストを見る</a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const upcomingReservations = reservations.filter((reservation) =>
    UPCOMING_STATUSES.has(reservation.status)
  )
  const pastReservations = reservations.filter(
    (reservation) => !UPCOMING_STATUSES.has(reservation.status)
  )

  return (
    <div className="space-y-6">
      {upcomingReservations.length > 0 && (
        <section aria-labelledby="upcoming-reservations-heading">
          <h3 id="upcoming-reservations-heading" className="mb-4 text-lg font-semibold">
            予約中
          </h3>
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            予約内容の変更・キャンセルはマイページからはできません。店舗までお電話でご連絡ください。
          </div>
          <div className="space-y-4">
            {upcomingReservations.map((reservation) => (
              <ReservationCard key={reservation.id} reservation={reservation} />
            ))}
          </div>
        </section>
      )}

      {pastReservations.length > 0 && (
        <section aria-labelledby="past-reservations-heading">
          <h3 id="past-reservations-heading" className="mb-4 text-lg font-semibold">
            利用履歴
          </h3>
          <div className="space-y-4">
            {pastReservations.map((reservation) => (
              <ReservationCard key={reservation.id} reservation={reservation} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

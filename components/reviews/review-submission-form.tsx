'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, MessageCircle, Star, Lock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { Review } from '@/lib/reviews/types'

interface EligibleReservation {
  id: string
  castId: string
  castName: string
  courseName?: string | null
  startTime: string
  endTime: string
}

interface ReviewSubmissionFormProps {
  storeId: string
  storeSlug: string
  onReviewCreated: (review: Review) => void
}

const ratingOptions = [5, 4, 3, 2, 1]

export function ReviewSubmissionForm({ storeId, storeSlug, onReviewCreated }: ReviewSubmissionFormProps) {
  const { data: session, status } = useSession()
  const { toast } = useToast()

  const [eligibleReservations, setEligibleReservations] = useState<EligibleReservation[]>([])
  const [loadingReservations, setLoadingReservations] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedReservationId, setSelectedReservationId] = useState('')
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const isCustomer = status === 'authenticated' && session?.user?.role === 'customer'

  useEffect(() => {
    if (!isCustomer) {
      setEligibleReservations([])
      return
    }

    async function fetchEligibleReservations() {
      setLoadingReservations(true)
      try {
        const response = await fetch(`/api/review/eligible?storeId=${encodeURIComponent(storeId)}`)
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload.error ?? '出勤履歴の取得に失敗しました')
        }

        const payload = (await response.json()) as EligibleReservation[]
        setEligibleReservations(payload)
      } catch (err) {
        console.error(err)
        toast({
          variant: 'destructive',
          description: err instanceof Error ? err.message : 'データの取得に失敗しました',
        })
      } finally {
        setLoadingReservations(false)
      }
    }

    fetchEligibleReservations()
  }, [isCustomer, storeId, toast])

  const selectedReservation = useMemo(
    () => eligibleReservations.find((reservation) => reservation.id === selectedReservationId) ?? null,
    [eligibleReservations, selectedReservationId]
  )

  const formattedReservations = useMemo(() => {
    return eligibleReservations.map((reservation) => {
      const start = new Date(reservation.startTime)
      return {
        ...reservation,
        label: `${format(start, 'M月d日 (EEE) HH:mm', { locale: ja })} / ${reservation.castName}`,
      }
    })
  }, [eligibleReservations])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!selectedReservationId) {
      setError('口コミを投稿する予約を選択してください')
      return
    }

    if (comment.trim().length < 10) {
      setError('口コミは10文字以上で入力してください')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reservationId: selectedReservationId,
          rating,
          comment: comment.trim(),
        }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error ?? '口コミの投稿に失敗しました')
      }

      onReviewCreated(payload as Review)
      setSuccess('口コミを送信しました。審査完了後に掲載されます。')
      setComment('')
      setRating(5)
      setSelectedReservationId('')
      setEligibleReservations((prev) => prev.filter((reservation) => reservation.id !== payload.reservationId))
    } catch (err) {
      setError(err instanceof Error ? err.message : '口コミの投稿に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return (
      <Card className="luxury-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-[#f5e6c4]">
            <Loader2 className="h-4 w-4 animate-spin" />
            口コミ投稿フォームを読み込み中...
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (!isCustomer) {
    return (
      <Card className="luxury-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-[#f5e6c4]">
            <Lock className="h-4 w-4" />
            会員様限定機能
          </CardTitle>
          <CardDescription>ご利用履歴のあるお客様のみ口コミを投稿できます。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            ログインまたは会員登録を行うと、過去のご利用分に対する口コミを投稿できます。
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/${storeSlug}/login`}>ログインする</Link>
            </Button>
            <Button
              variant="outline"
              className="border-[#3b2e1f] text-[#f5e6c4] hover:bg-[#2b2114]"
              asChild
            >
              <Link href={`/${storeSlug}/register`}>会員登録</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="luxury-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-[#f5e6c4]">
          <MessageCircle className="h-4 w-4 text-[#f3d08a]" />
          口コミを投稿する
        </CardTitle>
        <CardDescription>
          実際にご利用いただいたお客様の声を募集しています。スタッフの励みになりますので、ぜひ率直なご意見をお寄せください。
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-4">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="reservation">対象のご利用</Label>
            <Select
              value={selectedReservationId}
              onValueChange={setSelectedReservationId}
              disabled={loadingReservations || submitting || eligibleReservations.length === 0}
            >
              <SelectTrigger id="reservation">
                <SelectValue placeholder={loadingReservations ? '読み込み中...' : 'ご利用履歴を選択'} />
              </SelectTrigger>
              <SelectContent>
                {formattedReservations.map((reservation) => (
                  <SelectItem key={reservation.id} value={reservation.id}>
                    {reservation.label}
                    {reservation.courseName ? ` / ${reservation.courseName}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {eligibleReservations.length === 0 && !loadingReservations && (
              <p className="text-sm text-muted-foreground">
                投稿可能なご利用履歴がありません。施術完了後に表示されます。
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="rating">総合評価</Label>
            <Select
              value={String(rating)}
              onValueChange={(value) => setRating(Number(value))}
              disabled={submitting}
            >
              <SelectTrigger id="rating">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ratingOptions.map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-400" />
                      <span>{value} / 5</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">口コミ内容</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="キャストの印象やサービス内容など、感じたことを自由にお書きください。"
              rows={5}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              ※ 10文字以上で入力してください。公開前に運営で内容を確認します。
            </p>
          </div>

          {selectedReservation && (
            <div className="rounded-md border border-[#3b2e1f] bg-[#121212] p-3 text-sm text-[#f5e6c4]">
              <strong>{selectedReservation.castName}</strong> のご利用に対する口コミです。
            </div>
          )}

          <Button type="submit" disabled={submitting || !selectedReservationId} className="w-full">
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            口コミを送信する
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useStore } from '@/contexts/store-context'
import type { Review } from '@/lib/reviews/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2, RefreshCw, ShieldCheck, Filter, Eye, EyeOff, Trash2, Star } from 'lucide-react'

type StatusFilter = 'all' | 'published' | 'pending' | 'hidden'

const statusLabels: Record<Review['status'], { label: string; variant: 'default' | 'outline'; className?: string }> = {
  published: { label: '公開中', variant: 'default' },
  pending: { label: '審査中', variant: 'outline', className: 'border-amber-400 text-amber-600' },
  hidden: { label: '非公開', variant: 'outline', className: 'border-gray-300 text-gray-500' },
}

export default function AdminReviewsPage() {
  const { currentStore } = useStore()
  const { toast } = useToast()

  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const loadReviews = async () => {
    if (!currentStore?.id) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/review?storeId=${encodeURIComponent(currentStore.id)}&status=all`)
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error ?? '口コミ一覧の取得に失敗しました')
      }
      const payload = (await response.json()) as Review[]
      setReviews(payload)
    } catch (error) {
      console.error(error)
      toast({
        variant: 'destructive',
        description: error instanceof Error ? error.message : '口コミ一覧の取得に失敗しました',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadReviews()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStore?.id])

  const filteredReviews = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase()
    return reviews.filter((review) => {
      if (statusFilter !== 'all' && review.status !== statusFilter) {
        return false
      }

      if (normalized) {
        const matches =
          review.comment.toLowerCase().includes(normalized) ||
          review.castName.toLowerCase().includes(normalized) ||
          review.customerAlias.toLowerCase().includes(normalized)
        if (!matches) return false
      }

      return true
    })
  }, [reviews, statusFilter, searchTerm])

  const handleUpdateStatus = async (reviewId: string, nextStatus: Review['status']) => {
    try {
      const response = await fetch('/api/review', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: reviewId, status: nextStatus }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error ?? '口コミの更新に失敗しました')
      }

      setReviews((prev) => prev.map((review) => (review.id === reviewId ? (payload as Review) : review)))
      toast({ description: '口コミの公開状態を更新しました。' })
    } catch (error) {
      console.error(error)
      toast({
        variant: 'destructive',
        description: error instanceof Error ? error.message : '口コミの更新に失敗しました',
      })
    }
  }

  const handleDelete = async (reviewId: string) => {
    if (!confirm('この口コミを削除しますか？この操作は取り消せません。')) return

    try {
      const response = await fetch(`/api/review?id=${encodeURIComponent(reviewId)}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error ?? '口コミの削除に失敗しました')
      }

      setReviews((prev) => prev.filter((review) => review.id !== reviewId))
      toast({ description: '口コミを削除しました。' })
    } catch (error) {
      console.error(error)
      toast({
        variant: 'destructive',
        description: error instanceof Error ? error.message : '口コミの削除に失敗しました',
      })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ShieldCheck className="h-5 w-5 text-purple-600" />
              口コミ管理
            </CardTitle>
            <CardDescription>
              {currentStore?.name ?? '店舗'}に寄せられた口コミを確認し、公開ステータスを管理できます。
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadReviews} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              再読み込み
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Badge variant="outline" className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" /> 公開:{' '}
                {reviews.filter((review) => review.status === 'published').length}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" /> 審査中:{' '}
                {reviews.filter((review) => review.status === 'pending').length}
              </Badge>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                placeholder="コメント・キャスト名・投稿者を検索..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full sm:w-64"
              />
              <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="状態フィルタ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべての状態</SelectItem>
                  <SelectItem value="published">公開中</SelectItem>
                  <SelectItem value="pending">審査中</SelectItem>
                  <SelectItem value="hidden">非公開</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">口コミ</TableHead>
                  <TableHead className="w-[120px]">キャスト</TableHead>
                  <TableHead className="w-[100px]">評価</TableHead>
                  <TableHead className="w-[110px]">状態</TableHead>
                  <TableHead className="w-[160px]">投稿日</TableHead>
                  <TableHead className="w-[200px] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReviews.map((review) => {
                  const badgeInfo = statusLabels[review.status]
                  const createdAt = review.createdAt instanceof Date ? review.createdAt : new Date(review.createdAt)
                  return (
                    <TableRow key={review.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-700 line-clamp-3">{review.comment}</p>
                          <p className="text-xs text-gray-500">
                            投稿者: {review.customerAlias}
                            {review.customerArea ? ` / ${review.customerArea}` : ''}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{review.castName}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          {review.rating.toFixed(1)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={badgeInfo.variant} className={badgeInfo.className}>
                          {badgeInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600">
                          {format(createdAt, 'yyyy年MM月dd日 HH:mm', { locale: ja })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          {review.status !== 'published' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(review.id, 'published')}
                            >
                              <Eye className="mr-1 h-3.5 w-3.5" /> 公開する
                            </Button>
                          )}
                          {review.status !== 'hidden' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(review.id, 'hidden')}
                            >
                              <EyeOff className="mr-1 h-3.5 w-3.5" /> 非公開
                            </Button>
                          )}
                          {review.status !== 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(review.id, 'pending')}
                            >
                              <Filter className="mr-1 h-3.5 w-3.5" /> 審査中に戻す
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(review.id)}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" /> 削除
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}

                {filteredReviews.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-gray-500">
                      口コミが見つかりませんでした。
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

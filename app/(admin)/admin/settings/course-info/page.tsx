'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { getPricingUseCases } from '@/lib/pricing'
import type { CoursePrice } from '@/lib/pricing/types'
import {
  ArrowLeft,
  BookOpen,
  Clock,
  DollarSign,
  Edit,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react'

const DEFAULT_STORE_RATIO = 0.6

type CourseFormState = {
  name: string
  description: string
  duration: number
  price: number
  storeShare: number
  castShare: number
  isActive: boolean
}

function toCurrency(amount: number | null | undefined) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return '¥0'
  }
  return `¥${amount.toLocaleString()}`
}

function ensureShares(price: number, storeShare?: number | null, castShare?: number | null) {
  const safePrice = Math.max(0, price)
  let store = typeof storeShare === 'number' ? storeShare : Math.round(safePrice * DEFAULT_STORE_RATIO)
  let cast = typeof castShare === 'number' ? castShare : safePrice - store

  if (store + cast !== safePrice) {
    store = Math.min(store, safePrice)
    cast = Math.max(safePrice - store, 0)
  }

  return {
    storeShare: Math.max(0, store),
    castShare: Math.max(0, cast),
  }
}

function normalizeCourse(course: CoursePrice) {
  const { storeShare, castShare } = ensureShares(
    course.price,
    course.storeShare ?? undefined,
    course.castShare ?? undefined
  )

  return {
    ...course,
    description: course.description ?? '',
    storeShare,
    castShare,
  }
}

export default function CourseInfoPage() {
  const [courses, setCourses] = useState<CoursePrice[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<CoursePrice | null>(null)
  const [formData, setFormData] = useState<CourseFormState>({
    name: '',
    description: '',
    duration: 60,
    price: 0,
    storeShare: 0,
    castShare: 0,
    isActive: true,
  })

  const pricingUseCases = getPricingUseCases()
  const { toast } = useToast()

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true)
      const data = await pricingUseCases.getCourses()
      setCourses(data.map(normalizeCourse))
    } catch (error) {
      toast({
        title: 'エラー',
        description: 'コース情報の読み込みに失敗しました',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [pricingUseCases, toast])

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  const handleSync = async () => {
    try {
      setSyncing(true)
      await pricingUseCases.syncPricing('1')
      toast({
        title: '同期完了',
        description: '料金情報が全店舗に同期されました',
      })
    } catch (error) {
      toast({
        title: 'エラー',
        description: '同期に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setSyncing(false)
    }
  }

  const openCreateDialog = () => {
    setEditingCourse(null)
    setFormData({
      name: '',
      description: '',
      duration: 60,
      price: 0,
      storeShare: 0,
      castShare: 0,
      isActive: true,
    })
    setDialogOpen(true)
  }

  const openEditDialog = (course: CoursePrice) => {
    const normalized = normalizeCourse(course)
    setEditingCourse(normalized)
    setFormData({
      name: normalized.name,
      description: normalized.description ?? '',
      duration: normalized.duration,
      price: normalized.price,
      storeShare: normalized.storeShare ?? 0,
      castShare: normalized.castShare ?? 0,
      isActive: normalized.isActive,
    })
    setDialogOpen(true)
  }

  const handlePriceChange = (price: number) => {
    setFormData((prev) => {
      const safePrice = Math.max(0, price)
      const { storeShare, castShare } = ensureShares(
        safePrice,
        prev.storeShare,
        prev.castShare
      )
      return { ...prev, price: safePrice, storeShare, castShare }
    })
  }

  const handleStoreShareChange = (storeShare: number) => {
    setFormData((prev) => {
      const safeStore = Math.max(0, storeShare)
      const castShare = Math.max(prev.price - safeStore, 0)
      return { ...prev, storeShare: safeStore, castShare }
    })
  }

  const handleCastShareChange = (castShare: number) => {
    setFormData((prev) => {
      const safeCast = Math.max(0, castShare)
      const storeShare = Math.max(prev.price - safeCast, 0)
      return { ...prev, castShare: safeCast, storeShare }
    })
  }

  const handleSaveCourse = async () => {
    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || '',
      duration: Math.max(10, formData.duration || 0),
      price: Math.max(0, formData.price || 0),
      storeShare: Math.max(0, formData.storeShare || 0),
      castShare: Math.max(0, formData.castShare || 0),
      isActive: formData.isActive,
    }

    try {
      if (editingCourse) {
        const updated = await pricingUseCases.updateCourse(editingCourse.id, payload)
        setCourses((prev) => {
          const normalized = normalizeCourse(updated)
          return [...prev.filter((course) => course.id !== editingCourse.id), normalized]
        })
        toast({
          title: '更新完了',
          description: 'コース情報が更新されました',
        })
      } else {
        const created = await pricingUseCases.createCourse(payload)
        setCourses((prev) => [...prev, normalizeCourse(created)])
        toast({
          title: '追加完了',
          description: '新しいコースが追加されました',
        })
      }
      setDialogOpen(false)
    } catch (error) {
      toast({
        title: 'エラー',
        description: '保存に失敗しました',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteCourse = async (id: string) => {
    if (!confirm('このコースを削除しますか？')) return

    try {
      await pricingUseCases.deleteCourse(id)
      setCourses((prev) => prev.filter((course) => course.id !== id))
      toast({
        title: '削除完了',
        description: 'コースが削除されました',
      })
    } catch (error) {
      toast({
        title: 'エラー',
        description: '削除に失敗しました',
        variant: 'destructive',
      })
    }
  }

  const sortedCourses = useMemo(
    () => courses.slice().sort((a, b) => a.duration - b.duration || a.price - b.price),
    [courses]
  )

  const totalPrice = useMemo(
    () => sortedCourses.reduce((sum, course) => sum + course.price, 0),
    [sortedCourses]
  )

  const averagePrice = sortedCourses.length > 0 ? totalPrice / sortedCourses.length : 0

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600" />
          <p className="mt-4">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/settings">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <BookOpen className="h-8 w-8 text-emerald-600" />
              <h1 className="text-3xl font-bold text-gray-900">コース情報設定</h1>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSync} variant="outline" disabled={syncing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                全店舗に同期
              </Button>
              <Button onClick={openCreateDialog} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="mr-2 h-4 w-4" />
                新規コース追加
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-emerald-600">{sortedCourses.length}</div>
                <p className="text-sm text-gray-600">登録コース数</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-baseline gap-1 text-2xl font-bold text-blue-600">
                  <DollarSign className="h-5 w-5" />
                  {averagePrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <p className="text-sm text-gray-600">平均料金</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-baseline gap-1 text-2xl font-bold text-orange-600">
                  <Clock className="h-5 w-5" />
                  {sortedCourses.length > 0
                    ? Math.round(
                        sortedCourses.reduce((sum, course) => sum + course.duration, 0) /
                          sortedCourses.length
                      )
                    : 0}
                </div>
                <p className="text-sm text-gray-600">平均時間（分）</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>コース一覧</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">コース名</TableHead>
                    <TableHead className="w-32 whitespace-nowrap">時間</TableHead>
                    <TableHead className="w-40 whitespace-nowrap">料金</TableHead>
                    <TableHead className="w-48 whitespace-nowrap">取り分</TableHead>
                    <TableHead className="whitespace-nowrap">説明</TableHead>
                    <TableHead className="w-32 whitespace-nowrap">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCourses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium whitespace-nowrap">{course.name}</TableCell>
                      <TableCell className="whitespace-nowrap">{course.duration}分</TableCell>
                      <TableCell className="whitespace-nowrap">{toCurrency(course.price)}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        店舗 {toCurrency(course.storeShare)} / キャスト {toCurrency(course.castShare)}
                      </TableCell>
                      <TableCell className="max-w-md truncate text-sm text-gray-600">
                        {course.description || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(course)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCourse(course.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCourse ? 'コース編集' : '新規コース追加'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="course-name">コース名</Label>
              <Input
                id="course-name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="course-duration">時間（分）</Label>
                <Input
                  id="course-duration"
                  type="number"
                  min={10}
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, duration: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-price">料金（円）</Label>
                <Input
                  id="course-price"
                  type="number"
                  min={0}
                  value={formData.price}
                  onChange={(e) => handlePriceChange(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>合計</Label>
                <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                  {toCurrency(formData.price)}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="course-store">店舗取り分（円）</Label>
                <Input
                  id="course-store"
                  type="number"
                  min={0}
                  value={formData.storeShare}
                  onChange={(e) => handleStoreShareChange(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-cast">キャスト取り分（円）</Label>
                <Input
                  id="course-cast"
                  type="number"
                  min={0}
                  value={formData.castShare}
                  onChange={(e) => handleCastShareChange(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              合計 {toCurrency(formData.price)} = 店舗 {toCurrency(formData.storeShare)} + キャスト{' '}
              {toCurrency(formData.castShare)}
            </p>

            <div className="space-y-2">
              <Label htmlFor="course-description">説明（任意）</Label>
              <Textarea
                id="course-description"
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={handleSaveCourse} className="bg-emerald-600 hover:bg-emerald-700">
                保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, BookOpen, Plus, Edit, Trash2, Clock, DollarSign, RefreshCw } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import { getPricingUseCases, CoursePrice, CourseDuration } from '@/lib/pricing'
import { useToast } from '@/hooks/use-toast'

const DEFAULT_STORE_RATIO = 0.6

type DurationFormState = {
  time: number
  price: number
  storeShare: number
  castShare: number
}

function normalizeRevenueSplit(
  price: number,
  storeShare?: number | null,
  castShare?: number | null
): { storeShare: number; castShare: number } {
  const safePrice = Math.max(0, price || 0)
  let store = typeof storeShare === 'number' ? Math.max(0, storeShare) : Number.NaN
  let cast = typeof castShare === 'number' ? Math.max(0, castShare) : Number.NaN

  if (Number.isNaN(store) && Number.isNaN(cast)) {
    store = Math.round(safePrice * DEFAULT_STORE_RATIO)
    cast = Math.max(safePrice - store, 0)
  } else if (Number.isNaN(store)) {
    cast = Math.min(safePrice, cast)
    store = Math.max(safePrice - cast, 0)
  } else if (Number.isNaN(cast)) {
    store = Math.min(safePrice, store)
    cast = Math.max(safePrice - store, 0)
  } else {
    store = Math.min(store, safePrice)
    cast = Math.max(safePrice - store, 0)
  }

  return { storeShare: store, castShare: cast }
}

export default function CourseInfoPage() {
  const [courses, setCourses] = useState<CoursePrice[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<CoursePrice | null>(null)
  const { toast } = useToast()

  const pricingUseCases = getPricingUseCases()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    durations: [] as CourseDuration[],
    features: [] as string[],
    category: 'standard' as 'standard' | 'premium' | 'vip',
    displayOrder: 0,
    isActive: true,
    isPopular: false,
    targetAudience: '',
    minAge: 18,
    maxAge: 70,
  })

  const [durationForm, setDurationForm] = useState<DurationFormState>({
    time: 60,
    price: 0,
    storeShare: 0,
    castShare: 0,
  })

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true)
      const data = await pricingUseCases.getCourses()
      setCourses(data)
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
      // In a real app, this would sync with all stores
      await pricingUseCases.syncPricing('1') // Default store ID
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

  const handleAddCourse = () => {
    setEditingCourse(null)
    setFormData({
      name: '',
      description: '',
      durations: [],
      features: [],
      category: 'standard',
      displayOrder: courses.length + 1,
      isActive: true,
      isPopular: false,
      targetAudience: '',
      minAge: 18,
      maxAge: 70,
    })
    setDialogOpen(true)
  }

  const handleEditCourse = (course: CoursePrice) => {
    setEditingCourse(course)
    setFormData({
      name: course.name,
      description: course.description,
      durations: course.durations.map((duration) => {
        const { storeShare, castShare } = normalizeRevenueSplit(
          duration.price,
          duration.storeShare,
          duration.castShare
        )
        return {
          ...duration,
          storeShare,
          castShare,
        }
      }),
      features: [...course.features],
      category: course.category === 'campaign' ? 'standard' : course.category,
      displayOrder: course.displayOrder,
      isActive: course.isActive,
      isPopular: course.isPopular || false,
      targetAudience: course.targetAudience || '',
      minAge: course.minAge || 18,
      maxAge: course.maxAge || 70,
    })
    setDialogOpen(true)
  }

  const handleSaveCourse = async () => {
    try {
      const normalizedDurations = formData.durations.map((duration) => {
        const { storeShare, castShare } = normalizeRevenueSplit(
          duration.price,
          duration.storeShare,
          duration.castShare
        )
        return {
          ...duration,
          storeShare,
          castShare,
        }
      })

      const payload = {
        ...formData,
        durations: normalizedDurations,
      }

      if (editingCourse) {
        // Update existing course
        const updated = await pricingUseCases.updateCourse(editingCourse.id, payload)
        setCourses((prev) =>
          prev.map((course) => (course.id === editingCourse.id ? updated : course))
        )
        toast({
          title: '更新完了',
          description: 'コース情報が更新されました',
        })
      } else {
        // Create new course
        const newCourse = await pricingUseCases.createCourse(payload)
        setCourses((prev) => [...prev, newCourse])
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
    if (confirm('このコースを削除しますか？')) {
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
  }

  const handleToggleActive = async (id: string) => {
    try {
      const updated = await pricingUseCases.toggleCourseStatus(id)
      setCourses((prev) => prev.map((course) => (course.id === id ? updated : course)))
    } catch (error) {
      toast({
        title: 'エラー',
        description: 'ステータスの更新に失敗しました',
        variant: 'destructive',
      })
    }
  }

  const addDuration = () => {
    if (durationForm.time > 0 && durationForm.price > 0) {
      const { storeShare, castShare } = normalizeRevenueSplit(
        durationForm.price,
        durationForm.storeShare,
        durationForm.castShare
      )
      setFormData((prev) => ({
        ...prev,
        durations: [
          ...prev.durations,
          { ...durationForm, storeShare, castShare },
        ].sort((a, b) => a.time - b.time),
      }))
      setDurationForm({ time: 60, price: 0, storeShare: 0, castShare: 0 })
    }
  }

  const removeDuration = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      durations: prev.durations.filter((_, i) => i !== index),
    }))
  }

  const updateDurationForm = (field: keyof DurationFormState, value: number) => {
    setDurationForm((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'price') {
        const { storeShare, castShare } = normalizeRevenueSplit(
          next.price,
          next.storeShare,
          next.castShare
        )
        return { ...next, storeShare, castShare }
      }
      if (field === 'storeShare') {
        const { storeShare, castShare } = normalizeRevenueSplit(
          next.price,
          value,
          next.castShare
        )
        return { ...next, storeShare, castShare }
      }
      if (field === 'castShare') {
        const { storeShare, castShare } = normalizeRevenueSplit(
          next.price,
          next.storeShare,
          value
        )
        return { ...next, storeShare, castShare }
      }
      return next
    })
  }

  const addFeature = (feature: string) => {
    if (feature.trim() && !formData.features.includes(feature.trim())) {
      setFormData((prev) => ({
        ...prev,
        features: [...prev.features, feature.trim()],
      }))
    }
  }

  const removeFeature = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }))
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600"></div>
          <p className="mt-4">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="p-8">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
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
              <Button onClick={handleAddCourse} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="mr-2 h-4 w-4" />
                新規コース追加
              </Button>
            </div>
          </div>

          {/* Statistics */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-emerald-600">{courses.length}</div>
                <p className="text-sm text-gray-600">総コース数</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {courses.filter((course) => course.isActive).length}
                </div>
                <p className="text-sm text-gray-600">有効なコース</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">
                  {courses.filter((course) => course.category === 'premium').length}
                </div>
                <p className="text-sm text-gray-600">プレミアムコース</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">
                  {courses.filter((course) => course.isPopular).length}
                </div>
                <p className="text-sm text-gray-600">人気コース</p>
              </CardContent>
            </Card>
          </div>

          {/* Courses Table */}
          <Card>
            <CardHeader>
              <CardTitle>コース一覧</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>表示順</TableHead>
                    <TableHead>コース名</TableHead>
                    <TableHead>カテゴリー</TableHead>
                    <TableHead>料金</TableHead>
                    <TableHead>対象年齢</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((course) => (
                      <TableRow key={course.id}>
                        <TableCell>{course.displayOrder}</TableCell>
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-2 font-medium">
                              {course.name}
                              {course.isPopular && <Badge className="bg-purple-600">人気</Badge>}
                            </div>
                            <div className="text-sm text-gray-500">{course.description}</div>
                            <div className="mt-1 flex gap-1">
                              {course.features.slice(0, 3).map((feature, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {feature}
                                </Badge>
                              ))}
                              {course.features.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{course.features.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {course.category === 'standard' && 'スタンダード'}
                            {course.category === 'premium' && 'プレミアム'}
                            {course.category === 'vip' && 'VIP'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {course.durations.map((duration, index) => (
                              <div key={index} className="text-sm">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3 w-3 text-gray-400" />
                                  {duration.time}分: ¥{duration.price.toLocaleString()}
                                </div>
                                <div className="pl-5 text-xs text-muted-foreground">
                                  店舗 {duration.storeShare?.toLocaleString() ?? 0}円 / キャスト{' '}
                                  {duration.castShare?.toLocaleString() ?? 0}円
                                </div>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {course.minAge && course.maxAge
                            ? `${course.minAge}～${course.maxAge}歳`
                            : '制限なし'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={course.isActive}
                              onCheckedChange={() => handleToggleActive(course.id)}
                            />
                            <span className={course.isActive ? 'text-green-600' : 'text-gray-400'}>
                              {course.isActive ? '有効' : '無効'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditCourse(course)}
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

          {/* Course Add/Edit Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCourse ? 'コース編集' : '新規コース追加'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">コース名</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">説明</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">カテゴリー</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value: 'standard' | 'premium' | 'vip') =>
                        setFormData((prev) => ({ ...prev, category: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">スタンダード</SelectItem>
                        <SelectItem value="premium">プレミアム</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="displayOrder">表示順</Label>
                    <Input
                      id="displayOrder"
                      type="number"
                      value={formData.displayOrder}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          displayOrder: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>時間と料金</Label>
                  <div className="mb-2 grid gap-2 md:grid-cols-[repeat(4,minmax(0,1fr))]">
                    <Input
                      type="number"
                      placeholder="時間（分）"
                      value={durationForm.time}
                      onChange={(e) =>
                        setDurationForm((prev) => ({
                          ...prev,
                          time: Math.max(0, parseInt(e.target.value) || 0),
                        }))
                      }
                    />
                    <Input
                      type="number"
                      placeholder="料金（円）"
                      value={durationForm.price}
                      onChange={(e) =>
                        updateDurationForm('price', Math.max(0, parseInt(e.target.value) || 0))
                      }
                    />
                    <Input
                      type="number"
                      placeholder="店取り分（円）"
                      value={durationForm.storeShare}
                      onChange={(e) =>
                        updateDurationForm(
                          'storeShare',
                          Math.max(0, parseInt(e.target.value) || 0)
                        )
                      }
                    />
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="キャスト取り分（円）"
                        value={durationForm.castShare}
                        onChange={(e) =>
                          updateDurationForm(
                            'castShare',
                            Math.max(0, parseInt(e.target.value) || 0)
                          )
                        }
                      />
                      <Button type="button" onClick={addDuration}>
                        追加
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {formData.durations.map((duration, index) => (
                      <div
                        key={index}
                        className="space-y-2 rounded bg-gray-50 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-medium">
                            {duration.time}分: ¥{duration.price.toLocaleString()}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeDuration(index)}
                            >
                              削除
                            </Button>
                          </div>
                        </div>
                        <div className="grid gap-2 md:grid-cols-3">
                          <Input
                            type="number"
                            value={duration.price}
                            onChange={(e) => {
                              const nextPrice = Math.max(0, parseInt(e.target.value) || 0)
                              setFormData((prev) => {
                                const durations = [...prev.durations]
                                const current = durations[index]
                                const { storeShare, castShare } = normalizeRevenueSplit(
                                  nextPrice,
                                  current.storeShare,
                                  current.castShare
                                )
                                durations[index] = {
                                  ...current,
                                  price: nextPrice,
                                  storeShare,
                                  castShare,
                                }
                                return { ...prev, durations }
                              })
                            }}
                            placeholder="料金（円）"
                          />
                          <Input
                            type="number"
                            value={duration.storeShare ?? 0}
                            onChange={(e) => {
                              const nextStore = Math.max(0, parseInt(e.target.value) || 0)
                              setFormData((prev) => {
                                const durations = [...prev.durations]
                                const current = durations[index]
                                const { storeShare, castShare } = normalizeRevenueSplit(
                                  current.price,
                                  nextStore,
                                  current.castShare
                                )
                                durations[index] = { ...current, storeShare, castShare }
                                return { ...prev, durations }
                              })
                            }}
                            placeholder="店取り分（円）"
                          />
                          <Input
                            type="number"
                            value={duration.castShare ?? 0}
                            onChange={(e) => {
                              const nextCast = Math.max(0, parseInt(e.target.value) || 0)
                              setFormData((prev) => {
                                const durations = [...prev.durations]
                                const current = durations[index]
                                const { storeShare, castShare } = normalizeRevenueSplit(
                                  current.price,
                                  current.storeShare,
                                  nextCast
                                )
                                durations[index] = { ...current, storeShare, castShare }
                                return { ...prev, durations }
                              })
                            }}
                            placeholder="キャスト取り分（円）"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          自動計算: 店舗 {duration.storeShare?.toLocaleString() ?? 0}円 / キャスト{' '}
                          {duration.castShare?.toLocaleString() ?? 0}円（合計 ¥
                          {duration.price.toLocaleString()}）
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minAge">最低年齢</Label>
                    <Input
                      id="minAge"
                      type="number"
                      value={formData.minAge}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, minAge: parseInt(e.target.value) || 18 }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxAge">最高年齢</Label>
                    <Input
                      id="maxAge"
                      type="number"
                      value={formData.maxAge}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, maxAge: parseInt(e.target.value) || 70 }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetAudience">対象顧客</Label>
                  <Input
                    id="targetAudience"
                    value={formData.targetAudience}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, targetAudience: e.target.value }))
                    }
                    placeholder="例：マッサージ初心者の方におすすめ"
                  />
                </div>
                <div className="space-y-2">
                  <Label>特徴・サービス内容</Label>
                  <div className="mb-2 flex gap-2">
                    <Input
                      placeholder="特徴を入力してEnterキーで追加"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addFeature((e.target as HTMLInputElement).value)
                          ;(e.target as HTMLInputElement).value = ''
                        }
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.features.map((feature, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => removeFeature(index)}
                      >
                        {feature} ×
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, isActive: checked }))
                      }
                    />
                    <Label htmlFor="isActive">有効にする</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isPopular"
                      checked={formData.isPopular}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, isPopular: checked }))
                      }
                    />
                    <Label htmlFor="isPopular">人気コースとして表示</Label>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleSaveCourse}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    保存
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  )
}

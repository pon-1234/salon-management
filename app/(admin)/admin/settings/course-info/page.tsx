"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, BookOpen, Plus, Edit, Trash2, Clock, DollarSign, RefreshCw } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"
import { getPricingUseCases, CoursePrice, CourseDuration } from "@/lib/pricing"
import { useToast } from "@/hooks/use-toast"

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
    maxAge: 70
  })

  const [durationForm, setDurationForm] = useState({
    time: 60,
    price: 0
  })

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    try {
      setLoading(true)
      const data = await pricingUseCases.getCourses()
      setCourses(data)
    } catch (error) {
      toast({
        title: "エラー",
        description: "コース情報の読み込みに失敗しました",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      // In a real app, this would sync with all stores
      await pricingUseCases.syncPricing('1') // Default store ID
      toast({
        title: "同期完了",
        description: "料金情報が全店舗に同期されました",
      })
    } catch (error) {
      toast({
        title: "エラー",
        description: "同期に失敗しました",
        variant: "destructive",
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
      maxAge: 70
    })
    setDialogOpen(true)
  }

  const handleEditCourse = (course: CoursePrice) => {
    setEditingCourse(course)
    setFormData({
      name: course.name,
      description: course.description,
      durations: [...course.durations],
      features: [...course.features],
      category: course.category,
      displayOrder: course.displayOrder,
      isActive: course.isActive,
      isPopular: course.isPopular || false,
      targetAudience: course.targetAudience || '',
      minAge: course.minAge || 18,
      maxAge: course.maxAge || 70
    })
    setDialogOpen(true)
  }

  const handleSaveCourse = async () => {
    try {
      if (editingCourse) {
        // Update existing course
        const updated = await pricingUseCases.updateCourse(editingCourse.id, formData)
        setCourses(prev => prev.map(course => 
          course.id === editingCourse.id ? updated : course
        ))
        toast({
          title: "更新完了",
          description: "コース情報が更新されました",
        })
      } else {
        // Create new course
        const newCourse = await pricingUseCases.createCourse(formData)
        setCourses(prev => [...prev, newCourse])
        toast({
          title: "追加完了",
          description: "新しいコースが追加されました",
        })
      }
      setDialogOpen(false)
    } catch (error) {
      toast({
        title: "エラー",
        description: "保存に失敗しました",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCourse = async (id: string) => {
    if (confirm('このコースを削除しますか？')) {
      try {
        await pricingUseCases.deleteCourse(id)
        setCourses(prev => prev.filter(course => course.id !== id))
        toast({
          title: "削除完了",
          description: "コースが削除されました",
        })
      } catch (error) {
        toast({
          title: "エラー",
          description: "削除に失敗しました",
          variant: "destructive",
        })
      }
    }
  }

  const handleToggleActive = async (id: string) => {
    try {
      const updated = await pricingUseCases.toggleCourseStatus(id)
      setCourses(prev => prev.map(course => 
        course.id === id ? updated : course
      ))
    } catch (error) {
      toast({
        title: "エラー",
        description: "ステータスの更新に失敗しました",
        variant: "destructive",
      })
    }
  }

  const addDuration = () => {
    if (durationForm.time > 0 && durationForm.price > 0) {
      setFormData(prev => ({
        ...prev,
        durations: [...prev.durations, { ...durationForm }].sort((a, b) => a.time - b.time)
      }))
      setDurationForm({ time: 60, price: 0 })
    }
  }

  const removeDuration = (index: number) => {
    setFormData(prev => ({
      ...prev,
      durations: prev.durations.filter((_, i) => i !== index)
    }))
  }

  const addFeature = (feature: string) => {
    if (feature.trim() && !formData.features.includes(feature.trim())) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, feature.trim()]
      }))
    }
  }

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link href="/admin/settings">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <BookOpen className="w-8 h-8 text-emerald-600" />
              <h1 className="text-3xl font-bold text-gray-900">コース情報設定</h1>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleSync} 
                variant="outline"
                disabled={syncing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                全店舗に同期
              </Button>
              <Button onClick={handleAddCourse} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" />
                新規コース追加
              </Button>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-emerald-600">{courses.length}</div>
                <p className="text-sm text-gray-600">総コース数</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {courses.filter(course => course.isActive).length}
                </div>
                <p className="text-sm text-gray-600">有効なコース</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">
                  {courses.filter(course => course.category === 'premium').length}
                </div>
                <p className="text-sm text-gray-600">プレミアムコース</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">
                  {courses.filter(course => course.isPopular).length}
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
                          <div className="font-medium flex items-center gap-2">
                            {course.name}
                            {course.isPopular && (
                              <Badge className="bg-purple-600">人気</Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{course.description}</div>
                          <div className="flex gap-1 mt-1">
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
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <Clock className="w-3 h-3 text-gray-400" />
                              {duration.time}分: ¥{duration.price.toLocaleString()}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {course.minAge && course.maxAge ? 
                          `${course.minAge}～${course.maxAge}歳` : 
                          '制限なし'
                        }
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
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCourse(course.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCourse ? 'コース編集' : '新規コース追加'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">コース名</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">説明</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">カテゴリー</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value: 'standard' | 'premium' | 'vip') => 
                        setFormData(prev => ({ ...prev, category: value }))
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
                      onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>時間と料金</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      type="number"
                      placeholder="時間（分）"
                      value={durationForm.time}
                      onChange={(e) => setDurationForm(prev => ({ ...prev, time: parseInt(e.target.value) || 0 }))}
                    />
                    <Input
                      type="number"
                      placeholder="料金（円）"
                      value={durationForm.price}
                      onChange={(e) => setDurationForm(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                    />
                    <Button type="button" onClick={addDuration}>追加</Button>
                  </div>
                  <div className="space-y-2">
                    {formData.durations.map((duration, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span>{duration.time}分: ¥{duration.price.toLocaleString()}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDuration(index)}
                        >
                          削除
                        </Button>
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
                      onChange={(e) => setFormData(prev => ({ ...prev, minAge: parseInt(e.target.value) || 18 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxAge">最高年齢</Label>
                    <Input
                      id="maxAge"
                      type="number"
                      value={formData.maxAge}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxAge: parseInt(e.target.value) || 70 }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetAudience">対象顧客</Label>
                  <Input
                    id="targetAudience"
                    value={formData.targetAudience}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
                    placeholder="例：マッサージ初心者の方におすすめ"
                  />
                </div>
                <div className="space-y-2">
                  <Label>特徴・サービス内容</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="特徴を入力してEnterキーで追加"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addFeature((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = ''
                        }
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.features.map((feature, index) => (
                      <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeFeature(index)}>
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
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label htmlFor="isActive">有効にする</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isPopular"
                      checked={formData.isPopular}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPopular: checked }))}
                    />
                    <Label htmlFor="isPopular">人気コースとして表示</Label>
                  </div>
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
      </main>
    </div>
  )
}
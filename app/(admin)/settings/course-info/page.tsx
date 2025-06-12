"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, BookOpen, Plus, Edit, Trash2, Clock, DollarSign } from 'lucide-react'
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
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"

interface CourseItem {
  id: string
  name: string
  description: string
  duration: number
  price: number
  isActive: boolean
  category: string
  displayOrder: number
  features: string[]
  targetAudience: string
  minAge?: number
  maxAge?: number
}

export default function CourseInfoPage() {
  const [courses, setCourses] = useState<CourseItem[]>([
    {
      id: '1',
      name: '基本リラクゼーションコース',
      description: '全身をゆっくりとほぐすベーシックなコースです',
      duration: 60,
      price: 13000,
      isActive: true,
      category: 'ベーシック',
      displayOrder: 1,
      features: ['全身マッサージ', 'アロマ', 'リフレッシュ'],
      targetAudience: 'マッサージ初心者の方におすすめ',
      minAge: 18,
      maxAge: 70
    },
    {
      id: '2',
      name: 'プレミアムコース',
      description: 'ワンランク上の贅沢な時間をお過ごしいただけます',
      duration: 90,
      price: 18000,
      isActive: true,
      category: 'プレミアム',
      displayOrder: 2,
      features: ['全身マッサージ', 'ホットストーン', 'フェイシャルケア', 'アロマ'],
      targetAudience: '特別な時間をお求めの方に',
      minAge: 20,
      maxAge: 65
    },
    {
      id: '3',
      name: 'ショートリフレッシュコース',
      description: '短時間で疲れをリフレッシュ',
      duration: 45,
      price: 9000,
      isActive: true,
      category: 'ベーシック',
      displayOrder: 3,
      features: ['部分マッサージ', 'ストレッチ'],
      targetAudience: '時間がない方におすすめ',
      minAge: 18,
      maxAge: 80
    },
    {
      id: '4',
      name: 'ロングリラクゼーションコース',
      description: 'じっくりと時間をかけた究極のリラクゼーション',
      duration: 120,
      price: 24000,
      isActive: false,
      category: 'プレミアム',
      displayOrder: 4,
      features: ['全身マッサージ', 'ホットストーン', 'フェイシャルケア', 'ネックケア', 'フットケア'],
      targetAudience: '最高の癒しをお求めの方に',
      minAge: 25,
      maxAge: 60
    }
  ])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<CourseItem | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: 60,
    price: 0,
    isActive: true,
    category: '',
    displayOrder: 0,
    features: [] as string[],
    targetAudience: '',
    minAge: 18,
    maxAge: 70
  })

  const handleAddCourse = () => {
    setEditingCourse(null)
    setFormData({
      name: '',
      description: '',
      duration: 60,
      price: 0,
      isActive: true,
      category: '',
      displayOrder: courses.length + 1,
      features: [],
      targetAudience: '',
      minAge: 18,
      maxAge: 70
    })
    setDialogOpen(true)
  }

  const handleEditCourse = (course: CourseItem) => {
    setEditingCourse(course)
    setFormData({
      name: course.name,
      description: course.description,
      duration: course.duration,
      price: course.price,
      isActive: course.isActive,
      category: course.category,
      displayOrder: course.displayOrder,
      features: [...course.features],
      targetAudience: course.targetAudience,
      minAge: course.minAge || 18,
      maxAge: course.maxAge || 70
    })
    setDialogOpen(true)
  }

  const handleSaveCourse = () => {
    if (editingCourse) {
      // 編集
      setCourses(prev => prev.map(course => 
        course.id === editingCourse.id 
          ? { ...course, ...formData }
          : course
      ))
    } else {
      // 新規追加
      const newCourse: CourseItem = {
        id: Date.now().toString(),
        ...formData
      }
      setCourses(prev => [...prev, newCourse])
    }
    setDialogOpen(false)
  }

  const handleDeleteCourse = (id: string) => {
    if (confirm('このコースを削除しますか？')) {
      setCourses(prev => prev.filter(course => course.id !== id))
    }
  }

  const handleToggleActive = (id: string) => {
    setCourses(prev => prev.map(course => 
      course.id === id 
        ? { ...course, isActive: !course.isActive }
        : course
    ))
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

  const categories = [...new Set(courses.map(course => course.category))]

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="p-8">
        <div className="max-w-6xl mx-auto">
          {/* ヘッダー */}
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
            <Button onClick={handleAddCourse} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              新規コース追加
            </Button>
          </div>

          {/* 統計カード */}
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
                  {Math.round(courses.reduce((sum, course) => sum + course.duration, 0) / courses.length || 0)}分
                </div>
                <p className="text-sm text-gray-600">平均時間</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">
                  ¥{Math.round(courses.reduce((sum, course) => sum + course.price, 0) / courses.length || 0).toLocaleString()}
                </div>
                <p className="text-sm text-gray-600">平均価格</p>
              </CardContent>
            </Card>
          </div>

          {/* コース一覧テーブル */}
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
                    <TableHead>時間</TableHead>
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
                          <div className="font-medium">{course.name}</div>
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
                        <Badge variant="outline">{course.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {course.duration}分
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          ¥{course.price.toLocaleString()}
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

          {/* コース追加・編集ダイアログ */}
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
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">時間（分）</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">料金（円）</Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">カテゴリー</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
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
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  />
                  <Label htmlFor="isActive">有効にする</Label>
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
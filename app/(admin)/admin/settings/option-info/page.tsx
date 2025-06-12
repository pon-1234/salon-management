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
import { ArrowLeft, Package, Plus, Edit, Trash2, Eye } from 'lucide-react'
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
import Link from "next/link"

interface OptionItem {
  id: string
  name: string
  description: string
  price: number
  duration: number
  isActive: boolean
  category: string
  displayOrder: number
}

export default function OptionInfoPage() {
  const [options, setOptions] = useState<OptionItem[]>([
    {
      id: '1',
      name: 'ホットストーン',
      description: '温めた石を使用したリラクゼーション',
      price: 2000,
      duration: 0,
      isActive: true,
      category: 'リラクゼーション',
      displayOrder: 1
    },
    {
      id: '2',
      name: 'アロマトリートメント',
      description: 'お好みの香りでリラックス',
      price: 1500,
      duration: 10,
      isActive: true,
      category: 'リラクゼーション',
      displayOrder: 2
    },
    {
      id: '3',
      name: 'ネックトリートメント',
      description: '首・肩の集中ケア',
      price: 1000,
      duration: 15,
      isActive: true,
      category: 'ボディケア',
      displayOrder: 3
    },
    {
      id: '4',
      name: '延長（30分）',
      description: 'コース時間の延長',
      price: 8000,
      duration: 30,
      isActive: true,
      category: '延長',
      displayOrder: 4
    }
  ])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingOption, setEditingOption] = useState<OptionItem | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    duration: 0,
    isActive: true,
    category: '',
    displayOrder: 0
  })

  const handleAddOption = () => {
    setEditingOption(null)
    setFormData({
      name: '',
      description: '',
      price: 0,
      duration: 0,
      isActive: true,
      category: '',
      displayOrder: options.length + 1
    })
    setDialogOpen(true)
  }

  const handleEditOption = (option: OptionItem) => {
    setEditingOption(option)
    setFormData({
      name: option.name,
      description: option.description,
      price: option.price,
      duration: option.duration,
      isActive: option.isActive,
      category: option.category,
      displayOrder: option.displayOrder
    })
    setDialogOpen(true)
  }

  const handleSaveOption = () => {
    if (editingOption) {
      // 編集
      setOptions(prev => prev.map(opt => 
        opt.id === editingOption.id 
          ? { ...opt, ...formData }
          : opt
      ))
    } else {
      // 新規追加
      const newOption: OptionItem = {
        id: Date.now().toString(),
        ...formData
      }
      setOptions(prev => [...prev, newOption])
    }
    setDialogOpen(false)
  }

  const handleDeleteOption = (id: string) => {
    if (confirm('このオプションを削除しますか？')) {
      setOptions(prev => prev.filter(opt => opt.id !== id))
    }
  }

  const handleToggleActive = (id: string) => {
    setOptions(prev => prev.map(opt => 
      opt.id === id 
        ? { ...opt, isActive: !opt.isActive }
        : opt
    ))
  }

  const categories = [...new Set(options.map(opt => opt.category))]

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
              <Package className="w-8 h-8 text-emerald-600" />
              <h1 className="text-3xl font-bold text-gray-900">オプション情報設定</h1>
            </div>
            <Button onClick={handleAddOption} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              新規オプション追加
            </Button>
          </div>

          {/* 統計カード */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-emerald-600">{options.length}</div>
                <p className="text-sm text-gray-600">総オプション数</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {options.filter(opt => opt.isActive).length}
                </div>
                <p className="text-sm text-gray-600">有効なオプション</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">
                  {categories.length}
                </div>
                <p className="text-sm text-gray-600">カテゴリー数</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">
                  ¥{Math.round(options.reduce((sum, opt) => sum + opt.price, 0) / options.length || 0).toLocaleString()}
                </div>
                <p className="text-sm text-gray-600">平均価格</p>
              </CardContent>
            </Card>
          </div>

          {/* オプション一覧テーブル */}
          <Card>
            <CardHeader>
              <CardTitle>オプション一覧</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>表示順</TableHead>
                    <TableHead>オプション名</TableHead>
                    <TableHead>カテゴリー</TableHead>
                    <TableHead>料金</TableHead>
                    <TableHead>時間</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {options
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((option) => (
                    <TableRow key={option.id}>
                      <TableCell>{option.displayOrder}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{option.name}</div>
                          <div className="text-sm text-gray-500">{option.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{option.category}</Badge>
                      </TableCell>
                      <TableCell>¥{option.price.toLocaleString()}</TableCell>
                      <TableCell>
                        {option.duration > 0 ? `${option.duration}分` : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={option.isActive}
                            onCheckedChange={() => handleToggleActive(option.id)}
                          />
                          <span className={option.isActive ? 'text-green-600' : 'text-gray-400'}>
                            {option.isActive ? '有効' : '無効'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditOption(option)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteOption(option.id)}
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

          {/* オプション追加・編集ダイアログ */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingOption ? 'オプション編集' : '新規オプション追加'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">オプション名</Label>
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
                    <Label htmlFor="price">料金（円）</Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">時間（分）</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">カテゴリー</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
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
                  <Button onClick={handleSaveOption} className="bg-emerald-600 hover:bg-emerald-700">
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
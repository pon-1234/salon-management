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
import { ArrowLeft, Package, Plus, Edit, Trash2, RefreshCw, Clock } from 'lucide-react'
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
import { getPricingUseCases, OptionPrice } from '@/lib/pricing'
import { useToast } from '@/hooks/use-toast'

const DEFAULT_STORE_RATIO = 0.6

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

export default function OptionInfoPage() {
  const [options, setOptions] = useState<OptionPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingOption, setEditingOption] = useState<OptionPrice | null>(null)
  const { toast } = useToast()

  const pricingUseCases = getPricingUseCases()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    duration: 0,
    category: 'special' as 'relaxation' | 'body-care' | 'extension' | 'special',
    displayOrder: 0,
    isActive: true,
    note: '',
    storeShare: 0,
    castShare: 0,
  })

  const loadOptions = useCallback(async () => {
    try {
      setLoading(true)
      const data = await pricingUseCases.getOptions()
      setOptions(data)
    } catch (error) {
      toast({
        title: 'エラー',
        description: 'オプション情報の読み込みに失敗しました',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [pricingUseCases, toast])

  useEffect(() => {
    loadOptions()
  }, [loadOptions])

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

  const handleAddOption = () => {
    setEditingOption(null)
    setFormData({
      name: '',
      description: '',
      price: 0,
      duration: 0,
      category: 'special',
      displayOrder: options.length + 1,
      isActive: true,
      note: '',
      storeShare: 0,
      castShare: 0,
    })
    setDialogOpen(true)
  }

  const handleEditOption = (option: OptionPrice) => {
    setEditingOption(option)
    const { storeShare, castShare } = normalizeRevenueSplit(
      option.price,
      option.storeShare,
      option.castShare
    )
    setFormData({
      name: option.name,
      description: option.description || '',
      price: option.price,
      duration: option.duration || 0,
      category: option.category,
      displayOrder: option.displayOrder,
      isActive: option.isActive,
      note: option.note || '',
      storeShare,
      castShare,
    })
    setDialogOpen(true)
  }

  const handleSaveOption = async () => {
    try {
      const { storeShare, castShare } = normalizeRevenueSplit(
        formData.price,
        formData.storeShare,
        formData.castShare
      )
      const dataToSave = {
        ...formData,
        description: formData.description || undefined,
        duration: formData.duration || undefined,
        note: formData.note || undefined,
        storeShare,
        castShare,
      }

      if (editingOption) {
        // Update existing option
        const updated = await pricingUseCases.updateOption(editingOption.id, dataToSave)
        setOptions((prev) =>
          prev.map((option) => (option.id === editingOption.id ? updated : option))
        )
        toast({
          title: '更新完了',
          description: 'オプション情報が更新されました',
        })
      } else {
        // Create new option
        const newOption = await pricingUseCases.createOption(dataToSave)
        setOptions((prev) => [...prev, newOption])
        toast({
          title: '追加完了',
          description: '新しいオプションが追加されました',
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

  const handleDeleteOption = async (id: string) => {
    if (confirm('このオプションを削除しますか？')) {
      try {
        await pricingUseCases.deleteOption(id)
        setOptions((prev) => prev.filter((option) => option.id !== id))
        toast({
          title: '削除完了',
          description: 'オプションが削除されました',
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
      const updated = await pricingUseCases.toggleOptionStatus(id)
      setOptions((prev) => prev.map((option) => (option.id === id ? updated : option)))
    } catch (error) {
      toast({
        title: 'エラー',
        description: 'ステータスの更新に失敗しました',
        variant: 'destructive',
      })
    }
  }

  // Group options by category for statistics
  const optionsByCategory = options.reduce(
    (acc, option) => {
      acc[option.category] = (acc[option.category] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'special':
        return '特別オプション'
      case 'relaxation':
        return 'リラクゼーション'
      case 'body-care':
        return 'ボディケア'
      case 'extension':
        return '延長'
      default:
        return category
    }
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
              <Package className="h-8 w-8 text-emerald-600" />
              <h1 className="text-3xl font-bold text-gray-900">オプション情報設定</h1>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSync} variant="outline" disabled={syncing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                全店舗に同期
              </Button>
              <Button onClick={handleAddOption} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="mr-2 h-4 w-4" />
                新規オプション追加
              </Button>
            </div>
          </div>

          {/* Statistics */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-emerald-600">{options.length}</div>
                <p className="text-sm text-gray-600">総オプション数</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {options.filter((opt) => opt.isActive).length}
                </div>
                <p className="text-sm text-gray-600">有効なオプション</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">
                  {Object.keys(optionsByCategory).length}
                </div>
                <p className="text-sm text-gray-600">カテゴリー数</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">
                  ¥
                  {Math.round(
                    options.reduce((sum, opt) => sum + opt.price, 0) / options.length || 0
                  ).toLocaleString()}
                </div>
                <p className="text-sm text-gray-600">平均価格</p>
              </CardContent>
            </Card>
          </div>

          {/* Options Table */}
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
                            {option.description && (
                              <div className="text-sm text-gray-500">{option.description}</div>
                            )}
                            {option.note && (
                              <div className="mt-1 text-xs text-gray-400">{option.note}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getCategoryLabel(option.category)}</Badge>
                        </TableCell>
                        {(() => {
                          const { storeShare, castShare } = normalizeRevenueSplit(
                            option.price,
                            option.storeShare,
                            option.castShare
                          )
                          return (
                            <TableCell>
                              <div>¥{option.price.toLocaleString()}</div>
                              <div className="text-xs text-muted-foreground">
                                店舗 {storeShare.toLocaleString()}円 / キャスト{' '}
                                {castShare.toLocaleString()}円
                              </div>
                            </TableCell>
                          )
                        })()}
                        <TableCell>
                          {option.duration ? (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-gray-400" />
                              {option.duration}分
                            </div>
                          ) : (
                            '-'
                          )}
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
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteOption(option.id)}
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

          {/* Option Add/Edit Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingOption ? 'オプション編集' : '新規オプション追加'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">オプション名</Label>
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
                    <Label htmlFor="price">料金（円）</Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => {
                        const value = Math.max(0, parseInt(e.target.value) || 0)
                        setFormData((prev) => {
                          const { storeShare, castShare } = normalizeRevenueSplit(
                            value,
                            prev.storeShare,
                            prev.castShare
                          )
                          return { ...prev, price: value, storeShare, castShare }
                        })
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">時間（分）</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={formData.duration}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          duration: parseInt(e.target.value) || 0,
                        }))
                      }
                      placeholder="追加時間がない場合は0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="storeShare">店取り分（円）</Label>
                    <Input
                      id="storeShare"
                      type="number"
                      value={formData.storeShare}
                      onChange={(e) => {
                        const value = Math.max(0, parseInt(e.target.value) || 0)
                        setFormData((prev) => {
                          const { storeShare, castShare } = normalizeRevenueSplit(
                            prev.price,
                            value,
                            prev.castShare
                          )
                          return { ...prev, storeShare, castShare }
                        })
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="castShare">キャスト取り分（円）</Label>
                    <Input
                      id="castShare"
                      type="number"
                      value={formData.castShare}
                      onChange={(e) => {
                        const value = Math.max(0, parseInt(e.target.value) || 0)
                        setFormData((prev) => {
                          const { storeShare, castShare } = normalizeRevenueSplit(
                            prev.price,
                            prev.storeShare,
                            value
                          )
                          return { ...prev, storeShare, castShare }
                        })
                      }}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  合計: 店舗 {formData.storeShare.toLocaleString()}円 / キャスト{' '}
                  {formData.castShare.toLocaleString()}円 （コース料金 ¥
                  {formData.price.toLocaleString()}）
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">カテゴリー</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(
                        value: 'relaxation' | 'body-care' | 'extension' | 'special'
                      ) => setFormData((prev) => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="special">特別オプション</SelectItem>
                        <SelectItem value="relaxation">リラクゼーション</SelectItem>
                        <SelectItem value="body-care">ボディケア</SelectItem>
                        <SelectItem value="extension">延長</SelectItem>
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
                  <Label htmlFor="note">備考</Label>
                  <Input
                    id="note"
                    value={formData.note}
                    onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
                    placeholder="注意事項など"
                  />
                </div>
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
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleSaveOption}
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

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Receipt, Plus, Edit, Trash2, RefreshCw } from 'lucide-react'
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
import { getPricingUseCases, AdditionalFee } from '@/lib/pricing'
import { useToast } from '@/hooks/use-toast'

export default function AdditionalFeesPage() {
  const [fees, setFees] = useState<AdditionalFee[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingFee, setEditingFee] = useState<AdditionalFee | null>(null)
  const { toast } = useToast()

  const pricingUseCases = getPricingUseCases()

  const [formData, setFormData] = useState({
    name: '',
    type: 'fixed' as 'fixed' | 'percentage' | 'range',
    value: 0,
    minValue: 0,
    maxValue: 0,
    description: '',
    displayOrder: 0,
    isActive: true,
  })

  const loadFees = useCallback(async () => {
    try {
      setLoading(true)
      const data = await pricingUseCases.getAdditionalFees()
      setFees(data)
    } catch (error) {
      toast({
        title: 'エラー',
        description: '追加料金情報の読み込みに失敗しました',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [pricingUseCases, toast])

  useEffect(() => {
    loadFees()
  }, [loadFees])

  const handleSync = async () => {
    try {
      setSyncing(true)
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

  const handleAddFee = () => {
    setEditingFee(null)
    setFormData({
      name: '',
      type: 'fixed',
      value: 0,
      minValue: 0,
      maxValue: 0,
      description: '',
      displayOrder: fees.length + 1,
      isActive: true,
    })
    setDialogOpen(true)
  }

  const handleEditFee = (fee: AdditionalFee) => {
    setEditingFee(fee)
    const isRange = fee.type === 'range' && typeof fee.value === 'object'
    setFormData({
      name: fee.name,
      type: fee.type,
      value: isRange ? 0 : (fee.value as number),
      minValue: isRange ? fee.value.min : 0,
      maxValue: isRange ? fee.value.max : 0,
      description: fee.description || '',
      displayOrder: fee.displayOrder,
      isActive: fee.isActive,
    })
    setDialogOpen(true)
  }

  const handleSaveFee = async () => {
    try {
      const value =
        formData.type === 'range'
          ? { min: formData.minValue, max: formData.maxValue }
          : formData.value

      const dataToSave = {
        name: formData.name,
        type: formData.type,
        value,
        description: formData.description || undefined,
        displayOrder: formData.displayOrder,
        isActive: formData.isActive,
      }

      if (editingFee) {
        const updated = await pricingUseCases.updateAdditionalFee(editingFee.id, dataToSave)
        setFees((prev) => prev.map((fee) => (fee.id === editingFee.id ? updated : fee)))
        toast({
          title: '更新完了',
          description: '追加料金情報が更新されました',
        })
      } else {
        const newFee = await pricingUseCases.createAdditionalFee(dataToSave)
        setFees((prev) => [...prev, newFee])
        toast({
          title: '追加完了',
          description: '新しい追加料金が追加されました',
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

  const handleDeleteFee = async (id: string) => {
    if (confirm('この追加料金を削除しますか？')) {
      try {
        await pricingUseCases.deleteAdditionalFee(id)
        setFees((prev) => prev.filter((fee) => fee.id !== id))
        toast({
          title: '削除完了',
          description: '追加料金が削除されました',
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

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const fee = fees.find((f) => f.id === id)
      if (!fee) return

      const updated = await pricingUseCases.updateAdditionalFee(id, { isActive })
      setFees((prev) => prev.map((f) => (f.id === id ? updated : f)))
    } catch (error) {
      toast({
        title: 'エラー',
        description: 'ステータスの更新に失敗しました',
        variant: 'destructive',
      })
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'fixed':
        return '固定額'
      case 'percentage':
        return 'パーセンテージ'
      case 'range':
        return '範囲'
      default:
        return type
    }
  }

  const formatValue = (fee: AdditionalFee) => {
    if (fee.type === 'fixed') {
      return `¥${(fee.value as number).toLocaleString()}`
    } else if (fee.type === 'percentage') {
      return `${fee.value}%`
    } else if (fee.type === 'range' && typeof fee.value === 'object') {
      return `¥${fee.value.min.toLocaleString()}〜¥${fee.value.max.toLocaleString()}`
    }
    return '-'
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
              <Receipt className="h-8 w-8 text-emerald-600" />
              <h1 className="text-3xl font-bold text-gray-900">追加料金設定</h1>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSync} variant="outline" disabled={syncing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                全店舗に同期
              </Button>
              <Button onClick={handleAddFee} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="mr-2 h-4 w-4" />
                新規追加料金
              </Button>
            </div>
          </div>

          {/* Fees Table */}
          <Card>
            <CardHeader>
              <CardTitle>追加料金一覧</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>表示順</TableHead>
                    <TableHead>料金名</TableHead>
                    <TableHead>タイプ</TableHead>
                    <TableHead>金額</TableHead>
                    <TableHead>説明</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fees
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((fee) => (
                      <TableRow key={fee.id}>
                        <TableCell>{fee.displayOrder}</TableCell>
                        <TableCell className="font-medium">{fee.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getTypeLabel(fee.type)}</Badge>
                        </TableCell>
                        <TableCell className="font-mono">{formatValue(fee)}</TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {fee.description || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={fee.isActive}
                              onCheckedChange={(checked) => handleToggleActive(fee.id, checked)}
                            />
                            <span className={fee.isActive ? 'text-green-600' : 'text-gray-400'}>
                              {fee.isActive ? '有効' : '無効'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditFee(fee)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteFee(fee.id)}
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

          {/* Fee Add/Edit Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingFee ? '追加料金編集' : '新規追加料金'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">料金名</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="例：指名料、深夜料金"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">タイプ</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: 'fixed' | 'percentage' | 'range') =>
                      setFormData((prev) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">固定額</SelectItem>
                      <SelectItem value="percentage">パーセンテージ</SelectItem>
                      <SelectItem value="range">範囲</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.type === 'fixed' && (
                  <div className="space-y-2">
                    <Label htmlFor="value">金額（円）</Label>
                    <Input
                      id="value"
                      type="number"
                      value={formData.value}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, value: parseInt(e.target.value) || 0 }))
                      }
                    />
                  </div>
                )}

                {formData.type === 'percentage' && (
                  <div className="space-y-2">
                    <Label htmlFor="value">パーセンテージ（%）</Label>
                    <Input
                      id="value"
                      type="number"
                      value={formData.value}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, value: parseInt(e.target.value) || 0 }))
                      }
                      placeholder="例：20"
                    />
                  </div>
                )}

                {formData.type === 'range' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="minValue">最小金額（円）</Label>
                      <Input
                        id="minValue"
                        type="number"
                        value={formData.minValue}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            minValue: parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxValue">最大金額（円）</Label>
                      <Input
                        id="maxValue"
                        type="number"
                        value={formData.maxValue}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            maxValue: parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="description">説明（任意）</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="例：エリアにより変動"
                  />
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
                  <Button onClick={handleSaveFee} className="bg-emerald-600 hover:bg-emerald-700">
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

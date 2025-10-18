'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { RefreshCw, ArrowLeft, Pencil, Trash2, Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  DEFAULT_DESIGNATION_FEES,
  DesignationFeeConfig,
  normalizeDesignationShares,
} from '@/lib/designation/fees'

export default function DesignationFeesPage() {
  const { toast } = useToast()
  const [fees, setFees] = useState<DesignationFeeConfig[]>(DEFAULT_DESIGNATION_FEES)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingFee, setEditingFee] = useState<DesignationFee | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    storeShare: 0,
    castShare: 0,
    description: '',
    sortOrder: 1,
    isActive: true,
  })

  const orderedFees = useMemo(
    () => [...fees].sort((a, b) => a.sortOrder - b.sortOrder),
    [fees]
  )

  const openCreateDialog = useCallback(() => {
    setEditingFee(null)
    setFormData({
      name: '',
      price: 0,
      storeShare: 0,
      castShare: 0,
      description: '',
      sortOrder: fees.length + 1,
      isActive: true,
    })
    setDialogOpen(true)
  }, [fees.length])

  const openEditDialog = useCallback((fee: DesignationFee) => {
    setEditingFee(fee)
    setFormData({
      name: fee.name,
      price: fee.price,
      storeShare: fee.storeShare,
      castShare: fee.castShare,
      description: fee.description || '',
      sortOrder: fee.sortOrder,
      isActive: fee.isActive,
    })
    setDialogOpen(true)
  }, [])

  const handlePriceChange = useCallback((price: number) => {
    setFormData((prev) => normalizeDesignationShares(price, prev.storeShare, prev.castShare))
  }, [])

  const handleStoreShareChange = useCallback((storeShare: number) => {
    setFormData((prev) => normalizeDesignationShares(prev.price, storeShare, prev.castShare))
  }, [])

  const handleCastShareChange = useCallback((castShare: number) => {
    setFormData((prev) => normalizeDesignationShares(prev.price, prev.storeShare, castShare))
  }, [])

  const saveFee = useCallback(() => {
    if (!formData.name.trim()) {
      toast({
        title: '入力エラー',
        description: '名称を入力してください。',
        variant: 'destructive',
      })
      return
    }

    const normalized = {
      ...normalizeDesignationShares(formData.price, formData.storeShare, formData.castShare),
      name: formData.name.trim(),
      description: formData.description.trim(),
      sortOrder: Math.max(1, Math.round(formData.sortOrder)),
      isActive: formData.isActive,
    }

    if (editingFee) {
      setFees((prev) =>
        prev
          .map((fee) =>
            fee.id === editingFee.id
              ? {
                  ...editingFee,
                  ...normalized,
                }
              : fee
          )
          .sort((a, b) => a.sortOrder - b.sortOrder)
      )
      toast({ title: '更新しました', description: `${normalized.name}を更新しました。` })
    } else {
      const newId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `designation-${Date.now()}`
      const newFee: DesignationFee = {
        id: newId,
        ...normalized,
      }
      setFees((prev) => [...prev, newFee].sort((a, b) => a.sortOrder - b.sortOrder))
      toast({ title: '追加しました', description: `${normalized.name}を追加しました。` })
    }

    setDialogOpen(false)
  }, [editingFee, formData, toast])

  const removeFee = useCallback((id: string) => {
    if (!confirm('この指名料を削除しますか？')) return
    setFees((prev) => prev.filter((fee) => fee.id !== id))
    toast({ title: '削除しました' })
  }, [toast])

  const toggleActive = useCallback((id: string, value: boolean) => {
    setFees((prev) => prev.map((fee) => (fee.id === id ? { ...fee, isActive: value } : fee)))
  }, [])

  const handleSync = useCallback(() => {
    toast({
      title: '同期機能は準備中です',
      description: '実装後に全店舗へ同期できるようになります。',
    })
  }, [toast])

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 pb-12 pt-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/settings">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
                指名料設定
              </h1>
              <p className="text-sm text-muted-foreground">
                フリー指名や本指名などの料金と女性取り分を設定できます。
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSync}>
              <RefreshCw className="mr-2 h-4 w-4" /> 全店舗に同期
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" /> 新規項目追加
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>指名料一覧</CardTitle>
            <CardDescription>指名料ごとの料金と取り分バランスを一覧表示します。</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px] whitespace-nowrap">表示順</TableHead>
                  <TableHead className="whitespace-nowrap">名称</TableHead>
                  <TableHead className="w-[120px] whitespace-nowrap">料金</TableHead>
                  <TableHead className="w-[160px] whitespace-nowrap">取り分</TableHead>
                  <TableHead>備考</TableHead>
                  <TableHead className="w-[120px] whitespace-nowrap">ステータス</TableHead>
                  <TableHead className="w-[120px] whitespace-nowrap">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderedFees.map((fee) => (
                  <TableRow key={fee.id}>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      #{fee.sortOrder.toString().padStart(2, '0')}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-medium">{fee.name}</TableCell>
                    <TableCell className="whitespace-nowrap">¥{fee.price.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      店舗 ¥{fee.storeShare.toLocaleString()} / キャスト ¥{fee.castShare.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fee.description || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={fee.isActive}
                          onCheckedChange={(value) => toggleActive(fee.id, value)}
                        />
                        <Badge variant={fee.isActive ? 'secondary' : 'outline'} className="whitespace-nowrap">
                          {fee.isActive ? '有効' : '非表示'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(fee)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => removeFee(fee.id)}
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
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFee ? '指名料の編集' : '新しい指名料の追加'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="designation-name">名称</Label>
              <Input
                id="designation-name"
                value={formData.name}
                onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="designation-price">料金</Label>
                <Input
                  id="designation-price"
                  type="number"
                  min={0}
                  value={formData.price}
                  onChange={(event) => handlePriceChange(Number(event.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="designation-store">店舗取り分</Label>
                <Input
                  id="designation-store"
                  type="number"
                  min={0}
                  value={formData.storeShare}
                  onChange={(event) => handleStoreShareChange(Number(event.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="designation-cast">キャスト取り分</Label>
                <Input
                  id="designation-cast"
                  type="number"
                  min={0}
                  value={formData.castShare}
                  onChange={(event) => handleCastShareChange(Number(event.target.value) || 0)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="designation-desc">備考</Label>
              <Input
                id="designation-desc"
                value={formData.description}
                onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Label htmlFor="designation-order">表示順</Label>
                <Input
                  id="designation-order"
                  type="number"
                  min={0}
                  value={formData.sortOrder}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, sortOrder: Number(event.target.value) || 0 }))
                  }
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(value) => setFormData((prev) => ({ ...prev, isActive: value }))}
                />
                <span className="text-sm text-muted-foreground">有効にする</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={saveFee}>{editingFee ? '更新する' : '追加する'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

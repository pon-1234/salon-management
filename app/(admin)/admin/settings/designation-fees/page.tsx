'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { DEFAULT_DESIGNATION_FEES, normalizeDesignationShares } from '@/lib/designation/fees'
import {
  createDesignationFee,
  deleteDesignationFee,
  getDesignationFees,
  updateDesignationFee,
} from '@/lib/designation/data'
import type { DesignationFee } from '@/lib/designation/types'

export default function DesignationFeesPage() {
  const { toast } = useToast()
  const [fees, setFees] = useState<DesignationFee[]>(DEFAULT_DESIGNATION_FEES)
  const [loading, setLoading] = useState(true)
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

  const loadFees = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getDesignationFees({ includeInactive: true })
      if (Array.isArray(data) && data.length > 0) {
        setFees(data.sort((a, b) => a.sortOrder - b.sortOrder))
      } else {
        setFees(DEFAULT_DESIGNATION_FEES)
      }
    } catch (error) {
      console.error('Failed to load designation fees:', error)
      setFees(DEFAULT_DESIGNATION_FEES)
      toast({
        title: '読み込みエラー',
        description: '指名料の取得に失敗したため、デフォルト値を表示しています。',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void loadFees()
  }, [loadFees])

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

  const saveFee = useCallback(async () => {
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
      description: formData.description.trim() || null,
      sortOrder: Math.max(1, Math.round(formData.sortOrder)),
      isActive: formData.isActive,
    }

    try {
      if (editingFee) {
        const updated = await updateDesignationFee(editingFee.id, normalized)
        setFees((prev) =>
          prev
            .map((fee) => (fee.id === updated.id ? updated : fee))
            .sort((a, b) => a.sortOrder - b.sortOrder)
        )
        toast({ title: '更新しました', description: `${normalized.name}を更新しました。` })
      } else {
        const created = await createDesignationFee({
          ...normalized,
          sortOrder: normalized.sortOrder || fees.length + 1,
        })
        setFees((prev) => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder))
        toast({ title: '追加しました', description: `${normalized.name}を追加しました。` })
      }
      setDialogOpen(false)
    } catch (error) {
      console.error('Failed to save designation fee:', error)
      toast({
        title: '保存エラー',
        description: '指名料の保存に失敗しました。',
        variant: 'destructive',
      })
    }
  }, [editingFee, fees.length, formData, toast])

  const removeFee = useCallback(
    async (id: string) => {
      if (!confirm('この指名料を削除しますか？')) return
      try {
        await deleteDesignationFee(id)
        setFees((prev) => prev.filter((fee) => fee.id !== id))
        toast({ title: '削除しました' })
      } catch (error) {
        console.error('Failed to delete designation fee:', error)
        toast({
          title: '削除エラー',
          description: '指名料の削除に失敗しました。',
          variant: 'destructive',
        })
      }
    },
    [toast]
  )

  const toggleActive = useCallback(
    async (id: string, value: boolean) => {
      try {
        const updated = await updateDesignationFee(id, { isActive: value })
        setFees((prev) =>
          prev
            .map((fee) => (fee.id === updated.id ? updated : fee))
            .sort((a, b) => a.sortOrder - b.sortOrder)
        )
      } catch (error) {
        console.error('Failed to toggle designation fee status:', error)
        toast({
          title: '更新エラー',
          description: 'ステータスの更新に失敗しました。',
          variant: 'destructive',
        })
      }
    },
    [toast]
  )

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
            {loading && (
              <p className="mb-4 text-sm text-muted-foreground">指名料を読み込み中です...</p>
            )}
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
                          onCheckedChange={(value) => {
                            void toggleActive(fee.id, value)
                          }}
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
                          onClick={() => {
                            void removeFee(fee.id)
                          }}
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

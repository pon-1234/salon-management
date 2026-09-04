'use client'

/**
 * @design_doc   docs/PREVIEW_UAT_CHECKLIST.md management settings write-operation checks
 * @related_to   Designation fee API persists the reservation designation catalog
 * @known_issues None
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/admin/page-header'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Pencil, Trash2, Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { normalizeDesignationShares } from '@/lib/designation/fees'
import { inferDesignationKindFromName, type DesignationFeeKind } from '@/lib/designation/kind'
import {
  createDesignationFee,
  deleteDesignationFee,
  getDesignationFees,
  updateDesignationFee,
} from '@/lib/designation/data'
import type { DesignationFee } from '@/lib/designation/types'
import { useStore } from '@/contexts/store-context'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'

const KIND_LABELS: Record<DesignationFeeKind, string> = {
  free: 'フリー',
  repeat: 'リピート指名',
  panel: 'パネル・おすすめ',
  recommend: 'おすすめP指名',
  other: 'その他',
}

const STANDARD_RANK_PRESETS = [
  { name: 'ブロンズ', price: 1000 },
  { name: 'シルバー', price: 2000 },
  { name: 'ゴールド', price: 3000 },
  { name: 'プラチナ', price: 4000 },
  { name: 'ブラック', price: 5000 },
] as const

export default function DesignationFeesPage() {
  const { toast } = useToast()
  const { currentStore } = useStore()
  const [fees, setFees] = useState<DesignationFee[]>([])
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
    kind: 'other' as DesignationFeeKind,
  })

  const loadFees = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getDesignationFees({
        includeInactive: true,
        storeId: currentStore.id,
        surfaceErrors: true,
      })
      setFees(data.sort((a, b) => a.sortOrder - b.sortOrder))
    } catch (error) {
      console.error('Failed to load designation fees:', error)
      setFees([])
      toast({
        title: '読み込みエラー',
        description: '指名料を取得できませんでした。再読み込みしてください。',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [currentStore.id, toast])

  useEffect(() => {
    void loadFees()
  }, [loadFees])

  const orderedFees = useMemo(() => [...fees].sort((a, b) => a.sortOrder - b.sortOrder), [fees])
  const hasMissingStandardRanks = useMemo(() => {
    const existingNames = new Set(fees.map(({ name }) => name))
    return STANDARD_RANK_PRESETS.some(({ name }) => !existingNames.has(name))
  }, [fees])

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
      kind: 'other',
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
      kind: fee.kind ?? inferDesignationKindFromName(fee.name),
    })
    setDialogOpen(true)
  }, [])

  const handlePriceChange = useCallback((price: number) => {
    setFormData((prev) => {
      const normalized = normalizeDesignationShares(price, prev.storeShare, prev.castShare)
      return { ...prev, ...normalized }
    })
  }, [])

  const handleStoreShareChange = useCallback((storeShare: number) => {
    setFormData((prev) => {
      const normalized = normalizeDesignationShares(prev.price, storeShare, prev.castShare)
      return { ...prev, ...normalized }
    })
  }, [])

  const handleCastShareChange = useCallback((castShare: number) => {
    setFormData((prev) => {
      const normalized = normalizeDesignationShares(prev.price, prev.storeShare, castShare)
      return { ...prev, ...normalized }
    })
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
      kind: formData.kind,
    }

    try {
      if (editingFee) {
        const updated = await updateDesignationFee(editingFee.id, normalized, currentStore.id)
        setFees((prev) =>
          prev
            .map((fee) => (fee.id === updated.id ? updated : fee))
            .sort((a, b) => a.sortOrder - b.sortOrder)
        )
        toast({ title: '更新しました', description: `${normalized.name}を更新しました。` })
      } else {
        const created = await createDesignationFee(
          {
            ...normalized,
            sortOrder: normalized.sortOrder || fees.length + 1,
          },
          currentStore.id
        )
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
  }, [currentStore.id, editingFee, fees.length, formData, toast])

  const removeFee = useCallback(
    async (id: string) => {
      try {
        await deleteDesignationFee(id, currentStore.id)
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
    [currentStore.id, toast]
  )

  const toggleActive = useCallback(
    async (id: string, value: boolean) => {
      try {
        const updated = await updateDesignationFee(id, { isActive: value }, currentStore.id)
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
    [currentStore.id, toast]
  )

  const addStandardRanks = useCallback(async () => {
    const existingNames = new Set(fees.map(({ name }) => name))
    const missing = STANDARD_RANK_PRESETS.filter(({ name }) => !existingNames.has(name))
    if (missing.length === 0) {
      toast({ title: '標準ランクは登録済みです' })
      return
    }
    try {
      await Promise.all(
        missing.map((preset, index) =>
          createDesignationFee(
            {
              ...preset,
              storeShare: 0,
              castShare: preset.price,
              description: 'キャスト別の特別指名料ランク',
              sortOrder: fees.length + index + 1,
              isActive: true,
              kind: 'other',
            },
            currentStore.id
          )
        )
      )
      await loadFees()
      toast({ title: '標準ランクを追加しました' })
    } catch (error) {
      console.error('Failed to add standard designation ranks:', error)
      toast({ title: '標準ランクを追加できませんでした', variant: 'destructive' })
    }
  }, [currentStore.id, fees, loadFees, toast])

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 pb-12 pt-8">
        <PageHeader
          title="指名料・手取UP設定"
          description="特別指名料ランク、おすすめ・フリー・パネル指名、リピート指名の手取UPを一元管理します。"
          backHref="/admin/settings"
          backIcon={ArrowLeft}
          actions={
            <>
              {hasMissingStandardRanks && (
                <Button variant="outline" onClick={() => void addStandardRanks()}>
                  標準ランクを一括追加
                </Button>
              )}
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" /> 新規項目追加
              </Button>
            </>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>指名料一覧</CardTitle>
            <CardDescription>指名料ごとの料金と売上配分バランスを一覧表示します。</CardDescription>
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
                  <TableHead className="whitespace-nowrap">種別</TableHead>
                  <TableHead className="w-[120px] whitespace-nowrap">料金</TableHead>
                  <TableHead className="w-[160px] whitespace-nowrap">売上配分</TableHead>
                  <TableHead>備考</TableHead>
                  <TableHead className="w-[120px] whitespace-nowrap">ステータス</TableHead>
                  <TableHead className="w-[120px] whitespace-nowrap">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && orderedFees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      指名料が登録されていません。「新規項目追加」から登録してください。
                    </TableCell>
                  </TableRow>
                )}
                {orderedFees.map((fee) => (
                  <TableRow key={fee.id}>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      #{fee.sortOrder.toString().padStart(2, '0')}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-medium">{fee.name}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {KIND_LABELS[fee.kind ?? inferDesignationKindFromName(fee.name)]}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      ¥{fee.price.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      店舗 ¥{fee.storeShare.toLocaleString()} / キャスト ¥
                      {fee.castShare.toLocaleString()}
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
                        <Badge
                          variant={fee.isActive ? 'secondary' : 'outline'}
                          className="whitespace-nowrap"
                        >
                          {fee.isActive ? '有効' : '非表示'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(fee)}
                          aria-label={`${fee.name}を編集`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <ConfirmDialog
                          title="指名料を削除しますか？"
                          description={`「${fee.name}」を削除します。この操作は取り消せません。`}
                          confirmLabel="削除する"
                          onConfirm={() => removeFee(fee.id)}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700"
                            aria-label={`${fee.name}を削除`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </ConfirmDialog>
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

            <div className="space-y-2">
              <Label htmlFor="designation-kind">種別</Label>
              <Select
                value={formData.kind}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, kind: value as DesignationFeeKind }))
                }
              >
                <SelectTrigger id="designation-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(KIND_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <Label htmlFor="designation-store">店舗売上</Label>
                <Input
                  id="designation-store"
                  type="number"
                  min={0}
                  value={formData.storeShare}
                  onChange={(event) => handleStoreShareChange(Number(event.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="designation-cast">キャスト売上</Label>
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
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, description: event.target.value }))
                }
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

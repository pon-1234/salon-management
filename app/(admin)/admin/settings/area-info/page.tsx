'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import Link from 'next/link'
import {
  ArrowLeft,
  MapPin,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Building2,
  Train,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useStore } from '@/contexts/store-context'

interface StationSummary {
  id: string
  name: string
}

interface AreaSettings {
  id: string
  name: string
  prefecture?: string | null
  city?: string | null
  description?: string | null
  displayOrder: number
  isActive: boolean
  stations?: StationSummary[]
}

type AreaFormState = {
  id?: string
  name: string
  prefecture: string
  city: string
  description: string
  displayOrder: number
  isActive: boolean
}

const emptyForm: AreaFormState = {
  name: '',
  prefecture: '',
  city: '',
  description: '',
  displayOrder: 0,
  isActive: true,
}

export default function AreaInfoPage() {
  const [areas, setAreas] = useState<AreaSettings[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingArea, setEditingArea] = useState<AreaSettings | null>(null)
  const [formData, setFormData] = useState<AreaFormState>(emptyForm)
  const [syncing, setSyncing] = useState(false)
  const { toast } = useToast()
  const { currentStore } = useStore()

  const fetchAreas = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (currentStore?.id) {
        params.set('storeId', currentStore.id)
      }
      const query = params.toString()
      const response = await fetch(query ? `/api/settings/area?${query}` : '/api/settings/area', {
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error(await response.text())
      }
      const data = await response.json()
      const payload = Array.isArray(data?.data) ? data.data : data
      setAreas(payload || [])
    } catch (error) {
      console.error(error)
      toast({
        title: 'エラー',
        description: 'エリア情報の取得に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [currentStore?.id, toast])

  useEffect(() => {
    fetchAreas()
  }, [fetchAreas])

  const handleOpenDialog = (area?: AreaSettings) => {
    if (area) {
      setEditingArea(area)
      setFormData({
        id: area.id,
        name: area.name,
        prefecture: area.prefecture ?? '',
        city: area.city ?? '',
        description: area.description ?? '',
        displayOrder: area.displayOrder ?? 0,
        isActive: area.isActive,
      })
    } else {
      setEditingArea(null)
      setFormData({
        ...emptyForm,
        displayOrder: areas.length + 1,
      })
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    const payload = {
      id: formData.id,
      name: formData.name.trim(),
      prefecture: formData.prefecture.trim() || null,
      city: formData.city.trim() || null,
      description: formData.description.trim() || null,
      displayOrder: formData.displayOrder ?? 0,
      isActive: formData.isActive,
    }

    if (!payload.name) {
      toast({
        title: '入力エラー',
        description: 'エリア名は必須です',
        variant: 'destructive',
      })
      return
    }

    try {
      const method = editingArea ? 'PUT' : 'POST'
      const params = new URLSearchParams()
      if (currentStore?.id) {
        params.set('storeId', currentStore.id)
      }
      const query = params.toString()

      const response = await fetch(query ? `/api/settings/area?${query}` : '/api/settings/area', {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(await response.text())
      }

      toast({
        title: '保存しました',
        description: editingArea
          ? 'エリア情報を更新しました'
          : '新しいエリアを追加しました',
      })

      setDialogOpen(false)
      setFormData(emptyForm)
      setEditingArea(null)
      await fetchAreas()
    } catch (error) {
      console.error(error)
      toast({
        title: '保存に失敗しました',
        description: '入力内容を確認してください',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (area: AreaSettings) => {
    if (!confirm(`${area.name}を削除しますか？`)) return

    try {
      const params = new URLSearchParams({ id: area.id })
      if (currentStore?.id) {
        params.set('storeId', currentStore.id)
      }
      const query = params.toString()

      const response = await fetch(query ? `/api/settings/area?${query}` : '/api/settings/area', {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(await response.text())
      }

      toast({
        title: '削除しました',
        description: `${area.name}を削除しました`,
      })
      await fetchAreas()
    } catch (error) {
      console.error(error)
      toast({
        title: '削除に失敗しました',
        description: '再度お試しください',
        variant: 'destructive',
      })
    }
  }

  const handleToggleActive = async (area: AreaSettings) => {
    try {
      const params = new URLSearchParams()
      if (currentStore?.id) {
        params.set('storeId', currentStore.id)
      }
      const query = params.toString()

      const response = await fetch(query ? `/api/settings/area?${query}` : '/api/settings/area', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: area.id,
          name: area.name,
          prefecture: area.prefecture,
          city: area.city,
          description: area.description,
          displayOrder: area.displayOrder,
          isActive: !area.isActive,
        }),
      })

      if (!response.ok) {
        throw new Error(await response.text())
      }

      await fetchAreas()
    } catch (error) {
      console.error(error)
      toast({
        title: '更新に失敗しました',
        description: 'ステータスを変更できませんでした',
        variant: 'destructive',
      })
    }
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      await fetchAreas()
      toast({
        title: '最新の情報を取得しました',
        description: 'エリア情報を再読み込みしました',
      })
    } finally {
      setSyncing(false)
    }
  }

  const activeCount = useMemo(() => areas.filter((area) => area.isActive).length, [areas])
  const totalStations = useMemo(() => {
    return areas.reduce((sum, area) => sum + (area.stations?.length ?? 0), 0)
  }, [areas])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="p-8">
          <div className="mx-auto max-w-5xl">
            <div className="flex h-64 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600"></div>
                <p className="text-gray-600">エリア情報を読み込み中です...</p>
              </div>
            </div>
          </div>
        </main>
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
              <div>
                <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
                  <MapPin className="h-8 w-8 text-emerald-600" />
                  エリア情報設定
                </h1>
                <p className="text-sm text-gray-600">
                  サービス提供エリアの基本情報と登録駅を管理します
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSync} disabled={syncing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                最新情報に更新
              </Button>
              <Button onClick={() => handleOpenDialog()} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="mr-2 h-4 w-4" />
                新規エリア追加
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm text-muted-foreground">総エリア数</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-600">{areas.length}</p>
                </div>
                <Building2 className="h-8 w-8 text-emerald-500" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm text-muted-foreground">有効なエリア</p>
                  <p className="mt-1 text-2xl font-bold text-blue-600">{activeCount}</p>
                </div>
                <Badge variant="outline" className="text-blue-600">
                  稼働中
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm text-muted-foreground">登録駅数</p>
                  <p className="mt-1 text-2xl font-bold text-purple-600">{totalStations}</p>
                </div>
                <Train className="h-8 w-8 text-purple-500" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>エリア一覧</CardTitle>
              <CardDescription>
                表示順でソートされます。エリアの有効状態と登録駅を確認できます。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>表示順</TableHead>
                    <TableHead>エリア名</TableHead>
                    <TableHead>拠点</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>登録駅</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {areas
                    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
                    .map((area) => (
                      <TableRow key={area.id}>
                        <TableCell>{area.displayOrder ?? 0}</TableCell>
                        <TableCell>
                          <div className="font-medium">{area.name}</div>
                          {area.description && (
                            <div className="text-xs text-muted-foreground">{area.description}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {area.prefecture || area.city ? (
                            <div className="text-sm text-gray-600">
                              {[area.prefecture, area.city].filter(Boolean).join(' ')}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">未設定</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={area.isActive}
                              onCheckedChange={() => handleToggleActive(area)}
                            />
                            <span className={area.isActive ? 'text-green-600' : 'text-gray-400'}>
                              {area.isActive ? '有効' : '停止中'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {area.stations && area.stations.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {area.stations.slice(0, 3).map((station) => (
                                <Badge key={station.id} variant="secondary" className="text-xs">
                                  {station.name}
                                </Badge>
                              ))}
                              {area.stations.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{area.stations.length - 3}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">未登録</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(area)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(area)}
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingArea ? 'エリア情報を編集' : '新規エリアを追加'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">エリア名</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="例：渋谷エリア"
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
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="prefecture">都道府県</Label>
                <Input
                  id="prefecture"
                  value={formData.prefecture}
                  onChange={(e) => setFormData((prev) => ({ ...prev, prefecture: e.target.value }))}
                  placeholder="例：東京都"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">市区町村</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                  placeholder="例：渋谷区"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="サービス提供範囲の説明や注意事項を入力"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isActive: checked }))
                }
              />
              <Label htmlFor="isActive">エリアを有効にする</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false)
                  setEditingArea(null)
                  setFormData(emptyForm)
                }}
              >
                キャンセル
              </Button>
              <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
                保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

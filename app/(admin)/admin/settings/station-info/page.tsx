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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import Link from 'next/link'
import {
  ArrowLeft,
  Train,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  MapPin,
  Route,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useStore } from '@/contexts/store-context'

interface AreaOption {
  id: string
  name: string
}

interface StationSettings {
  id: string
  name: string
  line?: string | null
  areaId?: string | null
  area?: AreaOption | null
  transportationFee?: number | null
  travelTime?: number | null
  description?: string | null
  isActive: boolean
  displayOrder: number
}

interface StationFormState {
  id?: string
  name: string
  line: string
  areaId: string | null
  transportationFee: number
  travelTime: number
  description: string
  displayOrder: number
  isActive: boolean
}

const emptyForm: StationFormState = {
  name: '',
  line: '',
  areaId: null,
  transportationFee: 0,
  travelTime: 0,
  description: '',
  displayOrder: 0,
  isActive: true,
}

export default function StationInfoPage() {
  const [stations, setStations] = useState<StationSettings[]>([])
  const [areas, setAreas] = useState<AreaOption[]>([])
  const [selectedAreaId, setSelectedAreaId] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStation, setEditingStation] = useState<StationSettings | null>(null)
  const [formData, setFormData] = useState<StationFormState>(emptyForm)
  const [syncing, setSyncing] = useState(false)
  const { toast } = useToast()
  const { currentStore } = useStore()

  const fetchAreas = useCallback(async () => {
    try {
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
      if (Array.isArray(payload)) {
        const mapped = payload.map((area: any) => ({
          id: area.id,
          name: area.name,
        }))
        setAreas(mapped)
      }
    } catch (error) {
      console.error(error)
      toast({
        title: 'エラー',
        description: 'エリア一覧の取得に失敗しました',
        variant: 'destructive',
      })
    }
  }, [currentStore?.id, toast])

  const fetchStations = useCallback(
    async (areaId?: string) => {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        if (areaId && areaId !== 'all') {
          params.set('areaId', areaId)
        }
        if (currentStore?.id) {
          params.set('storeId', currentStore.id)
        }
        const query = params.toString()
        const response = await fetch(
          query ? `/api/settings/station?${query}` : '/api/settings/station',
          {
          credentials: 'include',
          }
        )
        if (!response.ok) {
          throw new Error(await response.text())
        }
        const data = await response.json()
        const payload = Array.isArray(data?.data) ? data.data : data
        setStations(payload || [])
      } catch (error) {
        console.error(error)
        toast({
          title: 'エラー',
          description: '駅情報の取得に失敗しました',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    },
    [currentStore?.id, toast]
  )

  useEffect(() => {
    fetchAreas()
    fetchStations()
  }, [fetchAreas, fetchStations])

  const handleOpenDialog = (station?: StationSettings) => {
    if (station) {
      setEditingStation(station)
      setFormData({
        id: station.id,
        name: station.name,
        line: station.line ?? '',
        areaId: station.areaId ?? null,
        transportationFee: station.transportationFee ?? 0,
        travelTime: station.travelTime ?? 0,
        description: station.description ?? '',
        displayOrder: station.displayOrder ?? 0,
        isActive: station.isActive,
      })
    } else {
      setEditingStation(null)
      setFormData({
        ...emptyForm,
        displayOrder: stations.length + 1,
      })
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: '入力エラー',
        description: '駅名は必須です',
        variant: 'destructive',
      })
      return
    }

    const payload = {
      id: formData.id,
      name: formData.name.trim(),
      line: formData.line.trim() || null,
      areaId: formData.areaId || null,
      transportationFee: Math.max(0, formData.transportationFee),
      travelTime: Math.max(0, formData.travelTime),
      description: formData.description.trim() || null,
      displayOrder: formData.displayOrder ?? 0,
      isActive: formData.isActive,
    }

    try {
      const method = editingStation ? 'PUT' : 'POST'
      const params = new URLSearchParams()
      if (currentStore?.id) {
        params.set('storeId', currentStore.id)
      }
      const query = params.toString()
      const response = await fetch(query ? `/api/settings/station?${query}` : '/api/settings/station', {
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
        description: editingStation ? '駅情報を更新しました' : '新しい駅を追加しました',
      })

      setDialogOpen(false)
      setFormData(emptyForm)
      setEditingStation(null)
      await fetchStations(selectedAreaId !== 'all' ? selectedAreaId : undefined)
    } catch (error) {
      console.error(error)
      toast({
        title: '保存に失敗しました',
        description: '入力内容を確認してください',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (station: StationSettings) => {
    if (!confirm(`${station.name}を削除しますか？`)) return

    try {
      const params = new URLSearchParams({ id: station.id })
      if (currentStore?.id) {
        params.set('storeId', currentStore.id)
      }
      const query = params.toString()
      const response = await fetch(query ? `/api/settings/station?${query}` : '/api/settings/station', {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error(await response.text())
      }
      toast({
        title: '削除しました',
        description: `${station.name}を削除しました`,
      })
      await fetchStations(selectedAreaId !== 'all' ? selectedAreaId : undefined)
    } catch (error) {
      console.error(error)
      toast({
        title: '削除に失敗しました',
        description: '再度お試しください',
        variant: 'destructive',
      })
    }
  }

  const handleToggleActive = async (station: StationSettings) => {
    try {
      const params = new URLSearchParams()
      if (currentStore?.id) {
        params.set('storeId', currentStore.id)
      }
      const query = params.toString()
      const response = await fetch(query ? `/api/settings/station?${query}` : '/api/settings/station', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: station.id,
          name: station.name,
          line: station.line ?? null,
          areaId: station.areaId ?? null,
          transportationFee: station.transportationFee ?? 0,
          travelTime: station.travelTime ?? 0,
          description: station.description ?? null,
          displayOrder: station.displayOrder ?? 0,
          isActive: !station.isActive,
        }),
      })

      if (!response.ok) {
        throw new Error(await response.text())
      }

      await fetchStations(selectedAreaId !== 'all' ? selectedAreaId : undefined)
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
      await fetchStations(selectedAreaId !== 'all' ? selectedAreaId : undefined)
      toast({
        title: '最新の情報を取得しました',
        description: '駅情報を再読み込みしました',
      })
    } finally {
      setSyncing(false)
    }
  }

  const activeCount = useMemo(() => stations.filter((station) => station.isActive).length, [stations])
  const averageFee = useMemo(() => {
    const fees = stations
      .map((station) => station.transportationFee ?? 0)
      .filter((fee) => typeof fee === 'number' && fee > 0)
    if (fees.length === 0) return 0
    return Math.round(fees.reduce((sum, fee) => sum + fee, 0) / fees.length)
  }, [stations])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="p-8">
          <div className="mx-auto max-w-6xl">
            <div className="flex h-64 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600"></div>
                <p className="text-gray-600">駅情報を読み込み中です...</p>
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
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/admin/settings">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
                  <Train className="h-8 w-8 text-emerald-600" />
                  駅情報設定
                </h1>
                <p className="text-sm text-gray-600">
                  最寄り駅や路線別の交通費・所要時間を管理します
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={selectedAreaId}
                onValueChange={(value) => {
                  setSelectedAreaId(value)
                  fetchStations(value !== 'all' ? value : undefined)
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="エリアで絞り込み" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべてのエリア</SelectItem>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleSync} disabled={syncing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                最新情報に更新
              </Button>
              <Button
                onClick={() => handleOpenDialog()}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                新規駅追加
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm text-muted-foreground">登録駅数</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-600">{stations.length}</p>
                </div>
                <Train className="h-8 w-8 text-emerald-500" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm text-muted-foreground">稼働中の駅</p>
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
                  <p className="text-sm text-muted-foreground">平均交通費</p>
                  <p className="mt-1 text-2xl font-bold text-purple-600">
                    ¥{averageFee.toLocaleString()}
                  </p>
                </div>
                <Route className="h-8 w-8 text-purple-500" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>駅一覧</CardTitle>
              <CardDescription>エリア別の駅情報を管理し、交通費や所要時間を設定します。</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>表示順</TableHead>
                    <TableHead>駅名</TableHead>
                    <TableHead>路線</TableHead>
                    <TableHead>エリア</TableHead>
                    <TableHead>交通費</TableHead>
                    <TableHead>目安時間</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stations
                    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
                    .map((station) => (
                      <TableRow key={station.id}>
                        <TableCell>{station.displayOrder ?? 0}</TableCell>
                        <TableCell>
                          <div className="font-medium">{station.name}</div>
                          {station.description && (
                            <div className="text-xs text-muted-foreground">
                              {station.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{station.line || <span className="text-xs text-muted-foreground">未設定</span>}</TableCell>
                        <TableCell>
                          {station.area?.name ? (
                            <Badge variant="secondary" className="text-xs">
                              {station.area.name}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">未割当</span>
                          )}
                        </TableCell>
                        <TableCell>¥{(station.transportationFee ?? 0).toLocaleString()}</TableCell>
                        <TableCell>
                          {station.travelTime ? `${station.travelTime}分` : '未設定'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={station.isActive}
                              onCheckedChange={() => handleToggleActive(station)}
                            />
                            <span className={station.isActive ? 'text-green-600' : 'text-gray-400'}>
                              {station.isActive ? '有効' : '停止中'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(station)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(station)}
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
            <DialogTitle>{editingStation ? '駅情報を編集' : '新規駅を追加'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="stationName">駅名</Label>
                <Input
                  id="stationName"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="例：渋谷駅"
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
                <Label htmlFor="line">路線</Label>
                <Input
                  id="line"
                  value={formData.line}
                  onChange={(e) => setFormData((prev) => ({ ...prev, line: e.target.value }))}
                  placeholder="例：JR山手線"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="area">エリア</Label>
                <Select
                  value={formData.areaId ?? 'none'}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, areaId: value === 'none' ? null : value }))
                  }
                >
                  <SelectTrigger id="area">
                    <SelectValue placeholder="エリアを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">未割当</SelectItem>
                    {areas.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="transportationFee">交通費（円）</Label>
                <Input
                  id="transportationFee"
                  type="number"
                  value={formData.transportationFee}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      transportationFee: Math.max(0, parseInt(e.target.value) || 0),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="travelTime">移動目安時間（分）</Label>
                <Input
                  id="travelTime"
                  type="number"
                  value={formData.travelTime}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      travelTime: Math.max(0, parseInt(e.target.value) || 0),
                    }))
                  }
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
                placeholder="送迎ルートや注意事項など"
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
              <Label htmlFor="isActive">駅を有効にする</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false)
                  setEditingStation(null)
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

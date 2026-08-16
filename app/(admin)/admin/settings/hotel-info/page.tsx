'use client'

/**
 * @design_doc   docs/HOTEL_DATA_MODEL.md
 * @related_to   ConfirmDialog; /api/settings/hotel; HotelSettings
 * @known_issues Service-area and structured-rate editing will use dedicated controls
 */
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/admin/page-header'
import { toast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Building, MapPin, Phone, Trash2, Plus } from 'lucide-react'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { useStore } from '@/contexts/store-context'
import { buildStoreScopedEndpoint } from '@/lib/store/endpoints'

interface Hotel {
  id: string
  hotelName: string
  area: string | null
  roomCount: number | null
  hourlyRate: number | null
  address: string | null
  phone: string | null
  checkInTime: string | null
  checkOutTime: string | null
  amenities: string[]
  notes: string | null
}

interface ApiResponse<T> {
  data: T
}

export default function HotelInfoPage() {
  const { currentStore } = useStore()
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [newHotel, setNewHotel] = useState<Partial<Hotel>>({
    hotelName: '',
    area: '',
    roomCount: null,
    hourlyRate: null,
    address: '',
    phone: '',
    checkInTime: null,
    checkOutTime: null,
    amenities: [],
    notes: '',
  })

  const [showAddForm, setShowAddForm] = useState(false)
  const [amenityInput, setAmenityInput] = useState('')

  const fetchHotels = useCallback(async () => {
    try {
      const response = await fetch(
        buildStoreScopedEndpoint('/api/settings/hotel', currentStore.id),
        { credentials: 'include' }
      )
      if (!response.ok) throw new Error('Failed to fetch hotels')

      const responseBody = (await response.json()) as ApiResponse<Hotel[]>
      if (!Array.isArray(responseBody.data)) throw new Error('Invalid hotel response')
      setHotels(responseBody.data)
    } catch (error) {
      console.error('Error fetching hotels:', error)
      toast({
        title: 'エラー',
        description: 'ホテル情報の取得に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [currentStore.id])

  useEffect(() => {
    fetchHotels()
  }, [fetchHotels])

  const handleAddHotel = async () => {
    if (newHotel.hotelName?.trim()) {
      setSaving(true)
      try {
        const response = await fetch(
          buildStoreScopedEndpoint('/api/settings/hotel', currentStore.id),
          {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(newHotel),
          }
        )

        if (!response.ok) throw new Error('Failed to add hotel')

        const responseBody = (await response.json()) as ApiResponse<Hotel>
        setHotels((current) => [...current, responseBody.data])

        setNewHotel({
          hotelName: '',
          area: '',
          roomCount: null,
          hourlyRate: null,
          address: '',
          phone: '',
          checkInTime: null,
          checkOutTime: null,
          amenities: [],
          notes: '',
        })
        setShowAddForm(false)

        toast({
          title: '成功',
          description: 'ホテル情報を追加しました',
        })
      } catch (error) {
        console.error('Error adding hotel:', error)
        toast({
          title: 'エラー',
          description: 'ホテル情報の追加に失敗しました',
          variant: 'destructive',
        })
      } finally {
        setSaving(false)
      }
    } else {
      toast({
        title: 'エラー',
        description: '必須項目を入力してください',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteHotel = async (id: string) => {
    try {
      const response = await fetch(
        buildStoreScopedEndpoint(
          `/api/settings/hotel?id=${encodeURIComponent(id)}`,
          currentStore.id
        ),
        {
          method: 'DELETE',
          credentials: 'include',
        }
      )

      if (!response.ok) throw new Error('Failed to delete hotel')

      setHotels(hotels.filter((hotel) => hotel.id !== id))

      toast({
        title: '成功',
        description: 'ホテル情報を削除しました',
      })
    } catch (error) {
      console.error('Error deleting hotel:', error)
      toast({
        title: 'エラー',
        description: 'ホテル情報の削除に失敗しました',
        variant: 'destructive',
      })
    }
  }

  const handleAddAmenity = () => {
    if (amenityInput.trim()) {
      setNewHotel({
        ...newHotel,
        amenities: [...(newHotel.amenities || []), amenityInput.trim()],
      })
      setAmenityInput('')
    }
  }

  const handleRemoveAmenity = (index: number) => {
    setNewHotel({
      ...newHotel,
      amenities: newHotel.amenities?.filter((_, i) => i !== index) || [],
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="p-8">
          <div className="mx-auto max-w-6xl">
            <div className="flex h-64 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600"></div>
                <p className="text-gray-600">読み込み中...</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-8">
        <div className="mx-auto max-w-6xl">
          <PageHeader
            title="ホテル情報設定"
            backHref="/admin/settings"
            backIcon={ArrowLeft}
            icon={Building}
          />

          <div className="space-y-6">
            {/* ホテル一覧 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-emerald-600" />
                    登録済みホテル一覧
                  </CardTitle>
                  <Button
                    onClick={() => setShowAddForm(true)}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    ホテル追加
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {hotels.map((hotel) => (
                    <div key={hotel.id} className="rounded-lg border bg-white p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-3">
                            <h3 className="text-lg font-semibold">{hotel.hotelName}</h3>
                            {hotel.area && (
                              <Badge variant="outline">旧表示グループ: {hotel.area}</Badge>
                            )}
                            {hotel.roomCount !== null && (
                              <Badge variant="secondary">{hotel.roomCount}室</Badge>
                            )}
                            {hotel.hourlyRate !== null && (
                              <Badge className="bg-emerald-100 text-emerald-800">
                                ¥{hotel.hourlyRate.toLocaleString()}/時間
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1 text-sm text-gray-600">
                            {hotel.address && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                {hotel.address}
                              </div>
                            )}
                            {hotel.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                {hotel.phone}
                              </div>
                            )}
                            {(hotel.checkInTime || hotel.checkOutTime) && (
                              <div className="text-sm">
                                チェックイン: {hotel.checkInTime ?? '未設定'} / チェックアウト:{' '}
                                {hotel.checkOutTime ?? '未設定'}
                              </div>
                            )}
                            {hotel.amenities && hotel.amenities.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {hotel.amenities.map((amenity, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {amenity}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {hotel.notes && (
                              <div className="mt-2 text-sm text-gray-500">備考: {hotel.notes}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <ConfirmDialog
                            title="ホテル情報を非表示にしますか？"
                            description={`「${hotel.hotelName}」を一覧から非表示にします。予約履歴は保持されます。`}
                            confirmLabel="非表示にする"
                            onConfirm={() => handleDeleteHotel(hotel.id)}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              aria-label={`${hotel.hotelName}を非表示`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </ConfirmDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ホテル追加フォーム */}
            {showAddForm && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-emerald-600" />
                    新規ホテル追加
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="hotelName">ホテル名 *</Label>
                      <Input
                        id="hotelName"
                        value={newHotel.hotelName || ''}
                        onChange={(e) => setNewHotel({ ...newHotel, hotelName: e.target.value })}
                        placeholder="ホテル名を入力"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="area">エリア（旧データ表示用）</Label>
                      <Input
                        id="area"
                        value={newHotel.area || ''}
                        onChange={(e) => setNewHotel({ ...newHotel, area: e.target.value })}
                        placeholder="池袋、新宿など"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="roomCount">客室数</Label>
                      <Input
                        id="roomCount"
                        type="number"
                        value={newHotel.roomCount ?? ''}
                        onChange={(e) => {
                          const value = e.target.value
                          setNewHotel({
                            ...newHotel,
                            roomCount: value === '' ? null : Number(value),
                          })
                        }}
                        placeholder="20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hourlyRate">参考時間料金</Label>
                      <Input
                        id="hourlyRate"
                        type="number"
                        value={newHotel.hourlyRate ?? ''}
                        onChange={(e) => {
                          const value = e.target.value
                          setNewHotel({
                            ...newHotel,
                            hourlyRate: value === '' ? null : Number(value),
                          })
                        }}
                        placeholder="3000"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="phone">電話番号</Label>
                      <Input
                        id="phone"
                        value={newHotel.phone || ''}
                        onChange={(e) => setNewHotel({ ...newHotel, phone: e.target.value })}
                        placeholder="03-1234-5678"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="checkInTime">チェックイン</Label>
                        <Input
                          id="checkInTime"
                          value={newHotel.checkInTime || ''}
                          onChange={(e) =>
                            setNewHotel({ ...newHotel, checkInTime: e.target.value })
                          }
                          placeholder="15:00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="checkOutTime">チェックアウト</Label>
                        <Input
                          id="checkOutTime"
                          value={newHotel.checkOutTime || ''}
                          onChange={(e) =>
                            setNewHotel({ ...newHotel, checkOutTime: e.target.value })
                          }
                          placeholder="10:00"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">住所</Label>
                    <Textarea
                      id="address"
                      value={newHotel.address || ''}
                      onChange={(e) => setNewHotel({ ...newHotel, address: e.target.value })}
                      placeholder="東京都..."
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>アメニティ</Label>
                    <div className="flex gap-2">
                      <Input
                        value={amenityInput}
                        onChange={(e) => setAmenityInput(e.target.value)}
                        placeholder="無料Wi-Fi、アメニティ完備など"
                        onKeyPress={(e) =>
                          e.key === 'Enter' && (e.preventDefault(), handleAddAmenity())
                        }
                      />
                      <Button type="button" onClick={handleAddAmenity} variant="outline">
                        アメニティを追加
                      </Button>
                    </div>
                    {newHotel.amenities && newHotel.amenities.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {newHotel.amenities.map((amenity, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() => handleRemoveAmenity(idx)}
                          >
                            {amenity} ×
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">備考</Label>
                    <Textarea
                      id="notes"
                      value={newHotel.notes || ''}
                      onChange={(e) => setNewHotel({ ...newHotel, notes: e.target.value })}
                      placeholder="キャスト専用の入口ありなど"
                      rows={2}
                    />
                  </div>
                  <div className="flex justify-end gap-4">
                    <Button variant="outline" onClick={() => setShowAddForm(false)}>
                      キャンセル
                    </Button>
                    <Button
                      onClick={handleAddHotel}
                      className="bg-emerald-600 hover:bg-emerald-700"
                      disabled={saving}
                    >
                      {saving ? '追加中...' : 'ホテルを追加'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 戻るボタン */}
            <div className="flex justify-end">
              <Link href="/admin/settings">
                <Button variant="outline">戻る</Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

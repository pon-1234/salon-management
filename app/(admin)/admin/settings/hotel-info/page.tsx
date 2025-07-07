'use client'

import { useState } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Building, MapPin, Phone, Star, Trash2, Plus } from 'lucide-react'
import Link from 'next/link'

interface Hotel {
  id: string
  name: string
  category: string
  address: string
  phone: string
  area: string
  displayOrder: number
  isRecommended: boolean
}

export default function HotelInfoPage() {
  const [hotels, setHotels] = useState<Hotel[]>([
    {
      id: '1',
      name: 'ホテル マリナーズコート東京',
      category: 'ビジネスホテル',
      address: '東京都品川区東品川4-12-8',
      phone: '03-1234-5678',
      area: '品川',
      displayOrder: 1,
      isRecommended: true,
    },
    {
      id: '2',
      name: '東京ベイホテル',
      category: 'シティホテル',
      address: '東京都港区台場1-9-1',
      phone: '03-2345-6789',
      area: 'お台場',
      displayOrder: 2,
      isRecommended: false,
    },
  ])

  const [newHotel, setNewHotel] = useState<Partial<Hotel>>({
    name: '',
    category: '',
    address: '',
    phone: '',
    area: '',
    displayOrder: hotels.length + 1,
    isRecommended: false,
  })

  const [showAddForm, setShowAddForm] = useState(false)

  const handleAddHotel = () => {
    if (newHotel.name && newHotel.category && newHotel.address) {
      const hotel: Hotel = {
        id: Date.now().toString(),
        name: newHotel.name,
        category: newHotel.category,
        address: newHotel.address,
        phone: newHotel.phone || '',
        area: newHotel.area || '',
        displayOrder: newHotel.displayOrder || hotels.length + 1,
        isRecommended: newHotel.isRecommended || false,
      }
      setHotels([...hotels, hotel])
      setNewHotel({
        name: '',
        category: '',
        address: '',
        phone: '',
        area: '',
        displayOrder: hotels.length + 2,
        isRecommended: false,
      })
      setShowAddForm(false)
      alert('ホテル情報を追加しました')
    }
  }

  const handleDeleteHotel = (id: string) => {
    if (confirm('このホテル情報を削除しますか？')) {
      setHotels(hotels.filter((hotel) => hotel.id !== id))
    }
  }

  const toggleRecommended = (id: string) => {
    setHotels(
      hotels.map((hotel) =>
        hotel.id === id ? { ...hotel, isRecommended: !hotel.isRecommended } : hotel
      )
    )
  }

  const handleSave = () => {
    console.log('Hotel info saved:', hotels)
    alert('ホテル情報を保存しました')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="p-8">
        <div className="mx-auto max-w-6xl">
          {/* ヘッダー */}
          <div className="mb-6 flex items-center gap-4">
            <Link href="/admin/settings">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <Building className="h-8 w-8 text-emerald-600" />
            <h1 className="text-3xl font-bold text-gray-900">ホテル情報設定</h1>
          </div>

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
                            <h3 className="text-lg font-semibold">{hotel.name}</h3>
                            <Badge variant="outline">{hotel.category}</Badge>
                            {hotel.isRecommended && (
                              <Badge className="bg-yellow-100 text-yellow-800">
                                <Star className="mr-1 h-3 w-3" />
                                おすすめ
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {hotel.address}
                            </div>
                            {hotel.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                {hotel.phone}
                              </div>
                            )}
                            {hotel.area && <div className="text-sm">エリア: {hotel.area}</div>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleRecommended(hotel.id)}
                          >
                            <Star
                              className={`h-4 w-4 ${hotel.isRecommended ? 'fill-yellow-400 text-yellow-400' : ''}`}
                            />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteHotel(hotel.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
                        value={newHotel.name || ''}
                        onChange={(e) => setNewHotel({ ...newHotel, name: e.target.value })}
                        placeholder="ホテル名を入力"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">カテゴリ *</Label>
                      <Input
                        id="category"
                        value={newHotel.category || ''}
                        onChange={(e) => setNewHotel({ ...newHotel, category: e.target.value })}
                        placeholder="ビジネスホテル、シティホテルなど"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="area">エリア</Label>
                      <Input
                        id="area"
                        value={newHotel.area || ''}
                        onChange={(e) => setNewHotel({ ...newHotel, area: e.target.value })}
                        placeholder="品川、新宿など"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">電話番号</Label>
                      <Input
                        id="phone"
                        value={newHotel.phone || ''}
                        onChange={(e) => setNewHotel({ ...newHotel, phone: e.target.value })}
                        placeholder="03-1234-5678"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">住所 *</Label>
                    <Textarea
                      id="address"
                      value={newHotel.address || ''}
                      onChange={(e) => setNewHotel({ ...newHotel, address: e.target.value })}
                      placeholder="東京都..."
                      rows={2}
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isRecommended"
                        checked={newHotel.isRecommended || false}
                        onChange={(e) =>
                          setNewHotel({ ...newHotel, isRecommended: e.target.checked })
                        }
                        className="rounded"
                      />
                      <Label htmlFor="isRecommended">おすすめホテルとして設定</Label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-4">
                    <Button variant="outline" onClick={() => setShowAddForm(false)}>
                      キャンセル
                    </Button>
                    <Button
                      onClick={handleAddHotel}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      追加
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 保存ボタン */}
            <div className="flex justify-end gap-4">
              <Link href="/admin/settings">
                <Button variant="outline">戻る</Button>
              </Link>
              <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
                保存
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

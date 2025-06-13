"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Store, MapPin, Phone, Mail, Clock, Globe } from 'lucide-react'
import Link from "next/link"

export default function StoreInfoPage() {
  const [formData, setFormData] = useState({
    storeName: "金の玉クラブ(池袋)",
    address: "東京都豊島区池袋2-1-1",
    phone: "03-1234-5678",
    email: "info@example.com",
    website: "https://example.com",
    businessHours: "10:00 - 24:00",
    description: "池袋エリアの高級メンズエステサロンです。",
    zipCode: "171-0014",
    prefecture: "東京都",
    city: "豊島区",
    building: "池袋ビル3F",
    businessDays: "年中無休",
    lastOrder: "23:30",
    parkingInfo: "近隣にコインパーキングあり",
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    // TODO: 実際の保存処理を実装
    console.log("Store info saved:", formData)
    alert("店舗情報を保存しました")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          {/* ヘッダー */}
          <div className="flex items-center gap-4 mb-6">
            <Link href="/admin/settings">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <Store className="w-8 h-8 text-emerald-600" />
            <h1 className="text-3xl font-bold text-gray-900">店舗情報設定</h1>
          </div>

          <div className="space-y-6">
            {/* 基本情報 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-emerald-600" />
                  基本情報
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="storeName">店舗名</Label>
                    <Input
                      id="storeName"
                      value={formData.storeName}
                      onChange={(e) => handleInputChange('storeName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">電話番号</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">メールアドレス</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">ウェブサイト</Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">店舗説明</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 住所情報 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  住所情報
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">郵便番号</Label>
                    <Input
                      id="zipCode"
                      value={formData.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                      placeholder="123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prefecture">都道府県</Label>
                    <Input
                      id="prefecture"
                      value={formData.prefecture}
                      onChange={(e) => handleInputChange('prefecture', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">市区町村</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">住所</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="building">建物名・階数</Label>
                    <Input
                      id="building"
                      value={formData.building}
                      onChange={(e) => handleInputChange('building', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parkingInfo">駐車場情報</Label>
                  <Input
                    id="parkingInfo"
                    value={formData.parkingInfo}
                    onChange={(e) => handleInputChange('parkingInfo', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 営業時間 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-600" />
                  営業時間
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessHours">営業時間</Label>
                    <Input
                      id="businessHours"
                      value={formData.businessHours}
                      onChange={(e) => handleInputChange('businessHours', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessDays">営業日</Label>
                    <Input
                      id="businessDays"
                      value={formData.businessDays}
                      onChange={(e) => handleInputChange('businessDays', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastOrder">ラストオーダー</Label>
                    <Input
                      id="lastOrder"
                      value={formData.lastOrder}
                      onChange={(e) => handleInputChange('lastOrder', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 保存ボタン */}
            <div className="flex justify-end gap-4">
              <Link href="/admin/settings">
                <Button variant="outline">キャンセル</Button>
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
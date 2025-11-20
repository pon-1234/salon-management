'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/header'
import { toast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { MARKETING_CHANNELS } from '@/lib/constants'
import { ArrowLeft, Store, MapPin, Phone, Mail, Clock, Globe } from 'lucide-react'
import Link from 'next/link'

const DEFAULT_MARKETING_CHANNEL_INPUT = MARKETING_CHANNELS.join('\n')

export default function StoreInfoPage() {
  const [formData, setFormData] = useState({
    storeName: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    businessHours: '',
    description: '',
    zipCode: '',
    prefecture: '',
    city: '',
    building: '',
    businessDays: '',
    lastOrder: '',
    parkingInfo: '',
    welfareExpenseRate: '10',
    marketingChannelsInput: DEFAULT_MARKETING_CHANNEL_INPUT,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchStoreSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/store')
      if (!response.ok) throw new Error('Failed to fetch store settings')

      const payload = await response.json()
      const settings = payload?.data ?? payload
      setFormData((prev) => ({
        ...prev,
        ...settings,
        welfareExpenseRate: settings?.welfareExpenseRate !== undefined
          ? String(Number(settings.welfareExpenseRate))
          : prev.welfareExpenseRate,
        marketingChannelsInput: Array.isArray(settings?.marketingChannels) && settings.marketingChannels.length > 0
          ? settings.marketingChannels.join('\n')
          : prev.marketingChannelsInput,
      }))
    } catch (error) {
      console.error('Error fetching store settings:', error)
      toast({
        title: 'エラー',
        description: '店舗情報の取得に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStoreSettings()
  }, [fetchStoreSettings])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { marketingChannelsInput, ...restForm } = formData
      const marketingChannels = String(marketingChannelsInput || '')
        .split(/\r?\n/)
        .map((channel) => channel.trim())
        .filter((channel, index, array) => channel.length > 0 && array.indexOf(channel) === index)

      const payload = {
        ...restForm,
        welfareExpenseRate: Number(formData.welfareExpenseRate || 0),
        marketingChannels: marketingChannels.length > 0 ? marketingChannels : [...MARKETING_CHANNELS],
      }
      const response = await fetch('/api/settings/store', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('Failed to save store settings')

      const payloadData = await response.json().catch(() => null)
      const updated = payloadData?.data ?? payloadData
      if (updated && typeof updated === 'object') {
        setFormData((prev) => ({
          ...prev,
          ...updated,
          welfareExpenseRate:
            updated?.welfareExpenseRate !== undefined
              ? String(Number(updated.welfareExpenseRate))
              : prev.welfareExpenseRate,
          marketingChannelsInput: Array.isArray(updated?.marketingChannels) && updated.marketingChannels.length > 0
            ? updated.marketingChannels.join('\n')
            : prev.marketingChannelsInput,
        }))
      }

      toast({
        title: '成功',
        description: '店舗情報を保存しました',
      })
    } catch (error) {
      console.error('Error saving store settings:', error)
      toast({
        title: 'エラー',
        description: '店舗情報の保存に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="p-8">
          <div className="mx-auto max-w-4xl">
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
      <Header />
      <main className="p-8">
        <div className="mx-auto max-w-4xl">
          {/* ヘッダー */}
          <div className="mb-6 flex items-center gap-4">
            <Link href="/admin/settings">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <Store className="h-8 w-8 text-emerald-600" />
            <h1 className="text-3xl font-bold text-gray-900">店舗情報設定</h1>
          </div>

          <div className="space-y-6">
            {/* 基本情報 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-emerald-600" />
                  基本情報
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
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

            {/* 厚生費設定 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-emerald-600" />
                  厚生費（雑費）設定
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="welfareExpenseRate">厚生費率（%）</Label>
                  <Input
                    id="welfareExpenseRate"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={100}
                    step={0.1}
                    value={formData.welfareExpenseRate}
                    onChange={(e) => handleInputChange('welfareExpenseRate', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    コース料金に対して自動計上される厚生費（店舗売上側で控除される分）の割合です。未入力の場合は10%が適用されます。
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 集客チャネル設定 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-emerald-600" />
                  集客チャネル（マスタ）
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="marketingChannelsInput">利用チャネル一覧</Label>
                  <Textarea
                    id="marketingChannelsInput"
                    value={formData.marketingChannelsInput}
                    onChange={(e) => handleInputChange('marketingChannelsInput', e.target.value)}
                    rows={6}
                    placeholder="例）&#10;店リピート&#10;電話&#10;紹介&#10;SNS&#10;WEB&#10;Heaven"
                  />
                  <p className="text-xs text-muted-foreground">
                    1行につき1つのチャネル名を入力してください。保存後は予約画面などで選択肢として利用できます。
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 住所情報 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-emerald-600" />
                  住所情報
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
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
                <div className="grid gap-4 md:grid-cols-2">
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
                  <Clock className="h-5 w-5 text-emerald-600" />
                  営業時間
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
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
              <Button
                onClick={handleSave}
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={saving}
              >
                {saving ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

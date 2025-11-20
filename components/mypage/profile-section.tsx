'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { User, Mail, Phone, Calendar, Gift, Edit2, Check, X } from 'lucide-react'
import { isVipMember } from '@/lib/utils'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useToast } from '@/components/ui/use-toast'

interface ProfileSectionProps {
  customerId: string
  user: {
    nickname: string
    email: string
    phone: string
    birthMonth: number
    memberType: 'regular' | 'vip'
    points: number
    registeredAt: Date
    smsEnabled: boolean
    emailNotificationEnabled: boolean
  }
  onProfileUpdated?: (updated: any) => void
}

export function ProfileSection({ user, customerId, onProfileUpdated }: ProfileSectionProps) {
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    nickname: user.nickname,
    email: user.email,
    phone: user.phone,
    smsEnabled: user.smsEnabled,
    emailNotifications: user.emailNotificationEnabled,
  })

  const handleSave = async () => {
    if (!formData.email.trim()) {
      toast({
        title: 'メールアドレスを入力してください',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/customer', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: customerId,
          name: formData.nickname,
          email: formData.email.trim(),
          phone: formData.phone,
          smsEnabled: formData.smsEnabled,
          emailNotificationEnabled: formData.emailNotifications,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error ?? 'プロフィールの更新に失敗しました')
      }

      const updated = await response.json()
      onProfileUpdated?.(updated)
      toast({ title: 'プロフィールを更新しました' })
      setIsEditing(false)
    } catch (error) {
      toast({
        title: '保存に失敗しました',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      nickname: user.nickname,
      email: user.email,
      phone: user.phone,
      smsEnabled: user.smsEnabled,
      emailNotifications: user.emailNotificationEnabled,
    })
    setIsEditing(false)
  }

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>基本情報</CardTitle>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 className="mr-2 h-4 w-4" />
              編集
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="mr-2 h-4 w-4" />
                キャンセル
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border border-white border-t-transparent" />
                    保存中...
                  </span>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    保存
                  </>
                )}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Nickname */}
          <div className="flex items-center gap-4">
            <User className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <Label htmlFor="nickname">ニックネーム</Label>
              {isEditing ? (
                <Input
                  id="nickname"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                />
              ) : (
                <p className="text-lg">{user.nickname}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center gap-4">
            <Mail className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <Label htmlFor="email">メールアドレス</Label>
              {isEditing ? (
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              ) : (
                <p className="text-lg">{user.email}</p>
              )}
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-center gap-4">
            <Phone className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <Label htmlFor="phone">電話番号</Label>
              {isEditing ? (
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              ) : (
                <p className="text-lg">{user.phone}</p>
              )}
            </div>
          </div>

          {/* Birth Month */}
          <div className="flex items-center gap-4">
            <Calendar className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <Label>誕生月</Label>
              <p className="text-lg">{user.birthMonth}月</p>
            </div>
          </div>

          {/* SMS Notifications */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="sms">SMS通知</Label>
              <p className="text-sm text-gray-500">お得な情報をSMSで受け取る</p>
            </div>
            <Switch
              id="sms"
              checked={isEditing ? formData.smsEnabled : user.smsEnabled}
              onCheckedChange={(checked) => {
                if (isEditing) {
                  setFormData({ ...formData, smsEnabled: checked })
                }
              }}
              disabled={!isEditing}
            />
          </div>

          {/* Email Notifications */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="emailNotifications">予約メール通知</Label>
              <p className="text-xs text-gray-500">
                予約確定・変更・キャンセルの内容をメールでお知らせします（オンライン予約にはメール登録が必須です）
              </p>
            </div>
            <Switch
              id="emailNotifications"
              checked={isEditing ? formData.emailNotifications : user.emailNotificationEnabled}
              onCheckedChange={(checked) => {
                if (isEditing) {
                  setFormData({ ...formData, emailNotifications: checked })
                }
              }}
              disabled={!isEditing}
            />
          </div>
        </CardContent>
      </Card>

      {/* Member Status */}
      <Card>
        <CardHeader>
          <CardTitle>会員ステータス</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>会員ランク</span>
            <Badge variant={isVipMember(user.memberType) ? 'default' : 'secondary'}>
              {isVipMember(user.memberType) ? 'VIP会員' : '通常会員'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>登録日</span>
            <span>{format(user.registeredAt, 'yyyy年MM月dd日', { locale: ja })}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>保有ポイント</span>
            <span className="text-xl font-bold text-purple-600">
              {user.points.toLocaleString()}pt
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Birthday Benefits */}
      {user.birthMonth === new Date().getMonth() + 1 && (
        <Alert className="border-yellow-500 bg-yellow-50">
          <Gift className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            お誕生日月特典が利用可能です！次回ご利用時に特別割引が適用されます。
          </AlertDescription>
        </Alert>
      )}

      {/* Account Management */}
      <Card>
        <CardHeader>
          <CardTitle>アカウント管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start">
            パスワードを変更
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start text-red-600 hover:text-red-700"
          >
            退会する
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { User, Mail, Phone, Calendar, Gift } from 'lucide-react'
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
    birthDate: Date | null
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
  const [isSaving, setIsSaving] = useState(false)
  const [smsEnabled, setSmsEnabled] = useState(user.smsEnabled)
  const [emailNotifications, setEmailNotifications] = useState(user.emailNotificationEnabled)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/customer', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: customerId,
          smsEnabled,
          emailNotificationEnabled: emailNotifications,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error ?? 'プロフィールの更新に失敗しました')
      }

      const updated = await response.json()
      onProfileUpdated?.(updated)
      toast({ title: '通知設定を更新しました' })
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

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Nickname */}
          <div className="flex items-center gap-4">
            <User className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <Label htmlFor="nickname">ニックネーム</Label>
              <p className="text-lg">{user.nickname}</p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center gap-4">
            <Mail className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <Label htmlFor="email">メールアドレス</Label>
              <p className="text-lg">{user.email}</p>
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-center gap-4">
            <Phone className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <Label htmlFor="phone">電話番号</Label>
              <p className="text-lg">{user.phone}</p>
            </div>
          </div>

          {/* Birth Month */}
          <div className="flex items-center gap-4">
            <Calendar className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <Label>誕生月</Label>
              <p className="text-lg">
                {user.birthDate
                  ? format(user.birthDate, 'yyyy年MM月dd日', { locale: ja })
                  : '未登録'}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            基本情報（ニックネーム・メールアドレス・電話番号・生年月日）の変更は店舗へご連絡ください。
          </div>

          {/* SMS Notifications */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="sms">SMS通知</Label>
              <p className="text-sm text-gray-500">お得な情報をSMSで受け取る</p>
            </div>
            <Switch
              id="sms"
              checked={smsEnabled}
              onCheckedChange={(checked) => setSmsEnabled(checked)}
              disabled={isSaving}
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
              checked={emailNotifications}
              onCheckedChange={(checked) => setEmailNotifications(checked)}
              disabled={isSaving}
            />
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border border-white border-t-transparent" />
                  保存中...
                </span>
              ) : (
                '通知設定を保存'
              )}
            </Button>
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

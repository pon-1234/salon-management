'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Store } from '@/lib/store/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, User, Mail, Phone, Lock, Gift } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface RegisterFormProps {
  store: Store
}

export function RegisterForm({ store }: RegisterFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [birthDate, setBirthDate] = useState<Date>()
  const [agreed, setAgreed] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!agreed) {
      alert('利用規約に同意してください')
      return
    }
    
    setLoading(true)
    // Simulate registration
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // In real app, this would make an API call
    alert('会員登録が完了しました！')
    router.push(`/${store.slug}/login`)
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 80 }, (_, i) => currentYear - 18 - i)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl text-center">会員登録</CardTitle>
        <CardDescription className="text-center">
          会員登録で特典がいっぱい！
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Benefits */}
        <div className="bg-purple-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Gift className="h-5 w-5 text-purple-600" />
            会員特典
          </h3>
          <ul className="space-y-1 text-sm text-gray-700">
            <li>• 初回登録で1000ポイントプレゼント</li>
            <li>• 会員限定の特別割引</li>
            <li>• 誕生日月に特別クーポン</li>
            <li>• 予約履歴の確認</li>
            <li>• お気に入りキャストの登録</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nickname */}
          <div className="space-y-2">
            <Label htmlFor="nickname">ニックネーム</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="nickname"
                placeholder="お好きなニックネーム"
                className="pl-10"
                required
              />
            </div>
            <p className="text-xs text-gray-500">
              サイト内で表示される名前です
            </p>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">電話番号</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="phone"
                type="tel"
                placeholder="090-1234-5678"
                pattern="[0-9]{3}-[0-9]{4}-[0-9]{4}"
                title="090-1234-5678の形式で入力してください"
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* Birth Date */}
          <div className="space-y-2">
            <Label>生年月日</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !birthDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {birthDate ? format(birthDate, "yyyy年MM月dd日", { locale: ja }) : "生年月日を選択"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3 space-y-2">
                  <Select
                    onValueChange={(year) => {
                      const newDate = birthDate || new Date()
                      newDate.setFullYear(parseInt(year))
                      setBirthDate(new Date(newDate))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="年を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(year => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}年
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Calendar
                  mode="single"
                  selected={birthDate}
                  onSelect={setBirthDate}
                  locale={ja}
                  disabled={(date) =>
                    date > new Date() || date < new Date("1900-01-01")
                  }
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">パスワード</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type="password"
                placeholder="8文字以上"
                className="pl-10"
                minLength={8}
                required
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">パスワード（確認）</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="パスワードを再入力"
                className="pl-10"
                minLength={8}
                required
              />
            </div>
          </div>

          {/* SMS Notifications */}
          <div className="flex items-center space-x-2">
            <Checkbox id="sms" />
            <Label
              htmlFor="sms"
              className="text-sm font-normal cursor-pointer"
            >
              お得な情報をSMSで受け取る
            </Label>
          </div>

          {/* Terms Agreement */}
          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked as boolean)}
            />
            <Label
              htmlFor="terms"
              className="text-sm font-normal cursor-pointer"
            >
              <Link href="/terms" className="text-blue-600 hover:underline">
                利用規約
              </Link>
              および
              <Link href="/privacy" className="text-blue-600 hover:underline">
                プライバシーポリシー
              </Link>
              に同意します
            </Label>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={loading || !agreed}
          >
            {loading ? '登録中...' : '会員登録'}
          </Button>
        </form>

        {/* Login Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            すでにアカウントをお持ちの方は
            <Link
              href={`/${store.slug}/login`}
              className="text-blue-600 hover:underline ml-1"
            >
              ログイン
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
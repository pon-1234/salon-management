/**
 * @design_doc   Customer registration form component with NextAuth.js integration
 * @related_to   NextAuth.js configuration, customer authentication
 * @known_issues None currently
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Store } from '@/lib/store/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, User, Mail, Phone, Lock, Gift, AlertCircle, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'

const registerSchema = z.object({
  nickname: z.string().min(1, 'ニックネームを入力してください'),
  email: z.string().email('正しいメールアドレスを入力してください').min(1, 'メールアドレスを入力してください'),
  phone: z.string().regex(/^[0-9]{3}-[0-9]{4}-[0-9]{4}$/, '090-1234-5678の形式で入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
  confirmPassword: z.string().min(8, 'パスワードを再入力してください'),
  birthDate: z.date().optional(),
  smsNotifications: z.boolean().optional(),
  agreed: z.boolean().refine(val => val === true, '利用規約に同意してください'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'パスワードが一致しません',
  path: ['confirmPassword'],
})

type RegisterFormData = z.infer<typeof registerSchema>

interface RegisterFormProps {
  store: Store
}

export function RegisterForm({ store }: RegisterFormProps) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [birthDate, setBirthDate] = useState<Date>()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      smsNotifications: false,
      agreed: false,
    },
  })

  const agreed = watch('agreed')

  // Redirect if already authenticated
  if (status === 'authenticated' && session?.user?.role === 'customer') {
    router.push(`/${store.slug}/mypage`)
    return null
  }

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nickname: data.nickname,
          email: data.email,
          phone: data.phone,
          password: data.password,
          birthDate: data.birthDate,
          smsNotifications: data.smsNotifications,
          storeId: store.id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '登録に失敗しました')
      }

      setSuccess('会員登録が完了しました！ログインページに移動します。')
      setTimeout(() => {
        router.push(`/${store.slug}/login`)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '登録中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 80 }, (_, i) => currentYear - 18 - i)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-center text-2xl">会員登録</CardTitle>
        <CardDescription className="text-center">会員登録で特典がいっぱい！</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Benefits */}
        <div className="mb-6 rounded-lg bg-purple-50 p-4">
          <h3 className="mb-2 flex items-center gap-2 font-semibold">
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

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nickname */}
          <div className="space-y-2">
            <Label htmlFor="nickname">ニックネーム</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input 
                id="nickname" 
                placeholder="お好きなニックネーム" 
                className="pl-10" 
                {...register('nickname')}
                disabled={loading}
              />
            </div>
            {errors.nickname && (
              <p className="text-sm text-red-600">{errors.nickname.message}</p>
            )}
            <p className="text-xs text-gray-500">サイト内で表示される名前です</p>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                className="pl-10"
                {...register('email')}
                disabled={loading}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">電話番号</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                id="phone"
                type="tel"
                placeholder="090-1234-5678"
                className="pl-10"
                {...register('phone')}
                disabled={loading}
              />
            </div>
            {errors.phone && (
              <p className="text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>

          {/* Birth Date */}
          <div className="space-y-2">
            <Label>生年月日</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !birthDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {birthDate
                    ? format(birthDate, 'yyyy年MM月dd日', { locale: ja })
                    : '生年月日を選択'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="space-y-2 p-3">
                  <Select
                    onValueChange={(year) => {
                      const newDate = birthDate || new Date()
                      newDate.setFullYear(parseInt(year))
                      setBirthDate(new Date(newDate))
                      setValue('birthDate', new Date(newDate))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="年を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}年
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Calendar
                  selectedDay={birthDate}
                  onSelectedDayChange={(date) => {
                    setBirthDate(date)
                    setValue('birthDate', date)
                  }}
                  disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">パスワード</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                id="password"
                type="password"
                placeholder="8文字以上"
                className="pl-10"
                {...register('password')}
                disabled={loading}
              />
            </div>
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">パスワード（確認）</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="パスワードを再入力"
                className="pl-10"
                {...register('confirmPassword')}
                disabled={loading}
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* SMS Notifications */}
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="sms" 
              {...register('smsNotifications')}
              disabled={loading}
            />
            <Label htmlFor="sms" className="cursor-pointer text-sm font-normal">
              お得な情報をSMSで受け取る
            </Label>
          </div>

          {/* Terms Agreement */}
          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              {...register('agreed')}
              disabled={loading}
            />
            <Label htmlFor="terms" className="cursor-pointer text-sm font-normal">
              <Link href="/terms" className="text-blue-600 hover:underline">
                利用規約
              </Link>
              および
              <Link href="/privacy" className="text-blue-600 hover:underline">
                プライバシーポリシー
              </Link>
              に同意します
            </Label>
            {errors.agreed && (
              <p className="text-sm text-red-600">{errors.agreed.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={loading || !agreed}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? '登録中...' : '会員登録'}
          </Button>
        </form>

        {/* Login Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            すでにアカウントをお持ちの方は
            <Link href={`/${store.slug}/login`} className="ml-1 text-blue-600 hover:underline">
              ログイン
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

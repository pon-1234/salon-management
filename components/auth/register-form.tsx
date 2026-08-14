'use client'

/**
 * @design_doc   Verified customer registration with recoverable store-scoped email delivery
 * @related_to   Registration API, email verification resend API, and customer authentication
 * @known_issues Provider delivery is confirmed asynchronously by receipt of email
 */
import { useEffect, useState } from 'react'
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
import { CalendarIcon, User, Mail, Phone, Lock, AlertCircle, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { isValidPhoneInput, normalizeWritableCustomerPhoneIdentity } from '@/lib/customer/utils'
import { normalizeCustomerEmail } from '@/lib/auth/customer-auth'
import { isBcryptSafePassword } from '@/lib/auth/password-policy'

const registerSchema = z
  .object({
    nickname: z.string().min(1, 'ニックネームを入力してください'),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('正しいメールアドレスを入力してください')
      .min(1, 'メールアドレスを入力してください'),
    phone: z
      .string()
      .min(1, '電話番号を入力してください')
      .refine(isValidPhoneInput, '数字とハイフンのみ入力してください')
      .refine(
        (value) => normalizeWritableCustomerPhoneIdentity(value) !== null,
        '有効な日本国内の電話番号を入力してください'
      ),
    password: z
      .string()
      .min(8, 'パスワードは8文字以上で入力してください')
      .refine(isBcryptSafePassword, 'パスワードは改行を含めず72バイト以内で入力してください'),
    confirmPassword: z.string().min(8, 'パスワードを再入力してください'),
    birthDate: z.date().optional(),
    smsNotifications: z.boolean().optional(),
    agreed: z.boolean().refine((val) => val === true, '利用規約に同意してください'),
  })
  .refine((data) => data.password === data.confirmPassword, {
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
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null)
  const [resendLoading, setResendLoading] = useState(false)

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
  const smsNotifications = watch('smsNotifications')

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'customer') {
      router.push(`/${store.slug}/mypage`)
    }
  }, [router, session?.user?.role, status, store.slug])

  if (status === 'authenticated' && session?.user?.role === 'customer') {
    return null
  }

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    setVerificationEmail(null)

    try {
      const normalizedEmail = normalizeCustomerEmail(data.email)
      const normalizedPhone = normalizeWritableCustomerPhoneIdentity(data.phone)
      if (!normalizedPhone) {
        throw new Error('有効な日本国内の電話番号を入力してください')
      }
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nickname: data.nickname,
          email: normalizedEmail,
          phone: normalizedPhone,
          password: data.password,
          birthDate: data.birthDate,
          smsNotifications: data.smsNotifications,
          storeId: store.id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        if (result?.code === 'VERIFICATION_DELIVERY_FAILED' && result?.accountCreated === true) {
          setVerificationEmail(normalizedEmail)
          setError(
            result.error ||
              '会員登録は完了しましたが、確認メールを送信できませんでした。再送してください。'
          )
          return
        }
        if (result?.code === 'PHONE_EXISTS') {
          throw new Error(
            'この電話番号は登録済みです。ログインまたはパスワード再設定をお試しください。旧会員データの引継ぎは店舗へお問い合わせください。'
          )
        }
        throw new Error(result.error || '登録に失敗しました')
      }

      setSuccess('会員登録が完了しました。確認メールをご確認ください。')
      setTimeout(() => {
        router.push(`/${store.slug}/login`)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '登録中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const resendVerificationEmail = async () => {
    if (!verificationEmail) {
      return
    }

    setResendLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch('/api/auth/verify-email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verificationEmail, storeId: store.id }),
      })

      if (!response.ok) {
        throw new Error(
          '確認メールの再送を受け付けられませんでした。しばらくしてからお試しください。'
        )
      }

      setSuccess(
        '入力されたメールアドレスに一致する未確認アカウントがある場合、確認メールを送信します。'
      )
    } catch (resendError) {
      setError(
        resendError instanceof Error
          ? resendError.message
          : '確認メールの再送中にエラーが発生しました'
      )
    } finally {
      setResendLoading(false)
    }
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 80 }, (_, i) => currentYear - 18 - i)

  return (
    <Card className="luxury-panel w-full">
      <CardHeader>
        <CardTitle className="text-center text-2xl text-[#f5e6c4]">会員登録</CardTitle>
        <CardDescription className="text-center">
          必要事項を入力し、メール認証を完了してください
        </CardDescription>
      </CardHeader>
      <CardContent>
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

        {verificationEmail && (
          <div className="mb-6">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={resendLoading}
              onClick={resendVerificationEmail}
            >
              {resendLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {resendLoading ? '再送中...' : '確認メールを再送'}
            </Button>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nickname */}
          <div className="space-y-2">
            <Label htmlFor="nickname">ニックネーム</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-[#cbb88f]" />
              <Input
                id="nickname"
                autoComplete="nickname"
                required
                placeholder="お好きなニックネーム"
                className="pl-10"
                {...register('nickname')}
                disabled={loading}
              />
            </div>
            {errors.nickname && <p className="text-sm text-red-600">{errors.nickname.message}</p>}
            <p className="text-xs text-gray-500">サイト内で表示される名前です</p>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-[#cbb88f]" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="example@email.com"
                className="pl-10"
                {...register('email')}
                disabled={loading}
              />
            </div>
            {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">電話番号</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-[#cbb88f]" />
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                required
                placeholder="09012345678 または 090-1234-5678"
                className="pl-10"
                {...register('phone')}
                disabled={loading}
              />
            </div>
            {errors.phone && <p className="text-sm text-red-600">{errors.phone.message}</p>}
            <p className="text-xs text-gray-500">
              ハイフンの有無は問いません。入力内容は自動で整形されます。
            </p>
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
                  onSelectedDayChange={(date: Date | undefined) => {
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
                autoComplete="new-password"
                required
                placeholder="8文字以上"
                className="pl-10"
                {...register('password')}
                disabled={loading}
              />
            </div>
            {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">パスワード（確認）</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
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
              name="smsNotifications"
              checked={Boolean(smsNotifications)}
              onCheckedChange={(checked) =>
                setValue('smsNotifications', checked === true, { shouldValidate: true })
              }
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
              name="agreed"
              required
              checked={Boolean(agreed)}
              onCheckedChange={(checked) =>
                setValue('agreed', checked === true, { shouldValidate: true })
              }
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
            {errors.agreed && <p className="text-sm text-red-600">{errors.agreed.message}</p>}
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

"use client"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const formSchema = z.object({
  name: z.string().min(1, '名前は必須です'),
  phone: z.string().min(1, '電話番号は必須です'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください').max(32, 'パスワードは32文字以下で入力してください'),
  birthDate: z.date({
    required_error: '生年月日を選択してください',
  }),
  memberType: z.enum(['regular', 'vip']),
  smsEnabled: z.boolean(),
  notes: z.string().max(1000, '特徴や好みは1000文字以内で入力してください').optional(),
  pointsToAdd: z.number().min(0).optional(),
  pointsAmount: z.number().min(0).optional(),
})

type FormData = z.infer<typeof formSchema>

export function NewCustomerContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [pointsInputEnabled, setPointsInputEnabled] = useState(false)
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      password: '',
      memberType: 'regular',
      smsEnabled: false,
      notes: '',
      pointsToAdd: 0,
      pointsAmount: 0,
    },
  })

  const calculateAge = (birthDate: Date) => {
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const birthDate = form.watch('birthDate')
  const age = birthDate ? calculateAge(birthDate) : null

  useEffect(() => {
    const phone = searchParams.get('phone')
    if (phone) {
      form.setValue('phone', phone)
    }
  }, [searchParams, form])

  const onSubmit = (data: FormData) => {
    console.log('Form submitted:', { ...data, age })
    router.push('/customers/1')
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">新規顧客登録</h1>
        <p className="text-sm text-gray-600 mt-2">顧客情報を入力してください</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* 基本情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">基本情報</CardTitle>
              <CardDescription>必須項目を入力してください</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">名前 <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="山田太郎" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">電話番号 <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="090-1234-5678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">メールアドレス <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="example@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">パスワード <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="8～32文字、英数字記号可" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">生年月日 <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <DatePicker
                          selected={field.value}
                          onSelect={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <Label className="text-sm font-medium text-gray-700">年齢</Label>
                  <div className="mt-2 px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-900">
                    {age !== null ? `${age}歳` : '生年月日から自動計算'}
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="memberType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">会員タイプ</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="regular">通常会員</SelectItem>
                          <SelectItem value="vip">VIPメンバー</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-4">
                <p className="text-sm text-gray-700 mb-2">登録日・最終ログイン・最終利用日は自動で設定されます</p>
              </div>
            </CardContent>
          </Card>

          {/* ポイント */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">ポイント</CardTitle>
              <CardDescription>初回ポイント付与（任意）</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={pointsInputEnabled}
                  onCheckedChange={setPointsInputEnabled}
                />
                <Label>ポイントを追加する</Label>
              </div>
              
              {pointsInputEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="pointsAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">金額（円）</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="1000" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="pointsToAdd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">ポイント</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="100" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* 連絡設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">連絡設定</CardTitle>
              <CardDescription>SMS送信の設定</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="smsEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">SMS受信設定</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        ONにするとSMS送信が可能になります
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* 特徴・備考 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">特徴や好み</CardTitle>
              <CardDescription>任意項目（1000文字以内）</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="顧客の特徴、好み、注意事項など"
                        className="min-h-[120px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8"
            >
              登録
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
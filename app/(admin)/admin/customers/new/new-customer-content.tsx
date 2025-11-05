'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  normalizePhoneNumber,
  normalizePhoneQuery,
  formatPhoneNumber,
  isValidPhoneInput,
} from '@/lib/customer/utils'

const phoneSchema = z
  .string()
  .min(1, '電話番号は必須です')
  .refine(isValidPhoneInput, '数字とハイフンのみ入力してください')
  .refine((value) => {
    const digits = normalizePhoneQuery(value)
    return digits.length >= 10 && digits.length <= 11
  }, '電話番号は10〜11桁の数字で入力してください')

const formSchema = z.object({
  store: z.string().min(1, '登録店舗を選択してください'),
  name: z.string().min(1, '名前は必須です'),
  phone: phoneSchema,
})

type FormData = z.infer<typeof formSchema>

export function NewCustomerContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      store: '',
      name: '',
      phone: '',
    },
  })

  useEffect(() => {
    const phone = searchParams.get('phone')
    if (phone) {
      form.setValue('phone', phone)
    }
  }, [searchParams, form])

  const onSubmit = (data: FormData) => {
    const normalizedPhone = normalizePhoneNumber(data.phone)
    console.log('Form submitted:', { ...data, phone: normalizedPhone })
    // 登録後は顧客詳細ページにリダイレクト（詳細情報は後で編集可能）
    router.push('/admin/customers/1')
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">新規顧客登録</h1>
        <p className="mt-2 text-sm text-gray-600">
          基本情報を入力してください。詳細情報は後で編集できます。
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">基本情報</CardTitle>
              <CardDescription>必須項目のみ入力してください</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="store"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      登録店舗 <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="店舗を選択してください" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ikebukuro">金の玉クラブ(池袋)</SelectItem>
                        <SelectItem value="shinjuku">金の玉クラブ(新宿)</SelectItem>
                        <SelectItem value="shibuya">金の玉クラブ(渋谷)</SelectItem>
                        <SelectItem value="ginza">金の玉クラブ(銀座)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      名前 <span className="text-red-500">*</span>
                    </FormLabel>
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
                    <FormLabel className="text-sm font-medium">
                      電話番号 <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="09012345678 または 090-1234-5678"
                        {...field}
                        onBlur={(event) => {
                          field.onBlur()
                          const normalized = normalizePhoneNumber(event.target.value)
                          const formatted = formatPhoneNumber(normalized)
                          form.setValue('phone', formatted, { shouldValidate: true })
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-gray-500">
                      ハイフンの有無は問いません。入力後は自動で整形されます。
                    </p>
                  </FormItem>
                )}
              />

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm text-blue-800">
                  <strong>📝 登録後について</strong>
                  <br />
                  基本登録後、顧客詳細ページでメールアドレス、生年月日、会員タイプなどの詳細情報を追加できます。
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-4 pt-6">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              キャンセル
            </Button>
            <Button type="submit" className="bg-emerald-600 px-8 text-white hover:bg-emerald-700">
              登録
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

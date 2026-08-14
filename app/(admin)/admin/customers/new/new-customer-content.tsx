/**
 * @design_doc   Administrative customer registration and reservation return flow
 * @related_to   POST /api/admin/customers; CustomerSelectionDialog
 * @known_issues Customers are global because the current schema has no customer-store ownership
 */
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useStore } from '@/contexts/store-context'
import {
  normalizePhoneNumber,
  normalizePhoneQuery,
  formatPhoneNumber,
  isValidPhoneInput,
} from '@/lib/customer/utils'
import { buildStoreScopedEndpoint } from '@/lib/store/endpoints'

const phoneSchema = z
  .string()
  .min(1, '電話番号は必須です')
  .refine(isValidPhoneInput, '数字とハイフンのみ入力してください')
  .refine((value) => {
    const digits = normalizePhoneQuery(value)
    return digits.length >= 10 && digits.length <= 11
  }, '電話番号は10〜11桁の数字で入力してください')

const formSchema = z.object({
  name: z.string().min(1, '名前は必須です'),
  phone: phoneSchema,
  email: z.string().email('正しいメールアドレスを入力してください').optional().or(z.literal('')),
})

type FormData = z.infer<typeof formSchema>
const IKEBUKURO_STORE_SLUG = 'ikebukuro'

export function NewCustomerContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { currentStore, availableStores, switchStore } = useStore()
  const phoneFromQuery = searchParams.get('phone') ?? ''
  const inheritedPhone = normalizePhoneQuery(phoneFromQuery)
  const isPhoneIntake =
    isValidPhoneInput(phoneFromQuery) && inheritedPhone.length >= 10 && inheritedPhone.length <= 11
  const requestedStore = searchParams.get('store')
  const requestedRegistrationStore =
    availableStores.find((store) => store.id === requestedStore || store.slug === requestedStore) ??
    currentStore
  const ikebukuroStore = availableStores.find((store) => store.slug === IKEBUKURO_STORE_SLUG)
  const registrationStore = isPhoneIntake ? ikebukuroStore : requestedRegistrationStore
  const returnsToReservation = searchParams.get('returnTo') === 'reservation'

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
    },
  })
  const { setValue } = form

  useEffect(() => {
    if (phoneFromQuery) {
      setValue('phone', isPhoneIntake ? inheritedPhone : phoneFromQuery)
    }
  }, [inheritedPhone, isPhoneIntake, phoneFromQuery, setValue])

  const onSubmit = async (data: FormData) => {
    if (!registrationStore) {
      form.setError('root', { message: '池袋店の利用権限を確認できません' })
      return
    }

    const normalizedPhone = normalizePhoneNumber(isPhoneIntake ? inheritedPhone : data.phone)
    try {
      const response = await fetch(
        buildStoreScopedEndpoint('/api/admin/customers', registrationStore.id),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: data.name,
            phone: normalizedPhone,
            email: data.email?.trim() || undefined,
          }),
        }
      )

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error ?? '顧客の登録に失敗しました')
      }

      const customerId = payload?.customer?.id
      if (typeof customerId !== 'string' || customerId.length === 0) {
        throw new Error('顧客登録の応答を確認できませんでした')
      }

      const encodedCustomerId = encodeURIComponent(customerId)
      const encodedStoreSlug = encodeURIComponent(registrationStore.slug)
      switchStore(registrationStore.slug)
      if (returnsToReservation) {
        router.push(`/admin/reservation?customerId=${encodedCustomerId}&store=${encodedStoreSlug}`)
      } else {
        router.push(`/admin/customers/${encodedCustomerId}?store=${encodedStoreSlug}`)
      }
    } catch (error) {
      console.error('Failed to create customer:', error)
      form.setError('root', {
        message: error instanceof Error ? error.message : '顧客の登録に失敗しました',
      })
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">新規顧客登録</h1>
        <p className="mt-2 text-sm text-gray-600">
          {isPhoneIntake
            ? '電話番号と店舗は引き継いでいます。名前だけ入力してください。'
            : '基本情報を入力してください。詳細情報は後で編集できます。'}
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      名前 <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="山田太郎"
                        disabled={isPhoneIntake && !registrationStore}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isPhoneIntake ? (
                registrationStore ? (
                  <div className="grid gap-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium text-emerald-700">登録先店舗（固定）</p>
                      <p className="mt-1 font-semibold text-emerald-950">
                        {registrationStore.displayName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-emerald-700">電話番号（引継ぎ済み）</p>
                      <p className="mt-1 font-semibold text-emerald-950">
                        {formatPhoneNumber(inheritedPhone)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                  >
                    池袋店の利用権限を確認できません。管理者へ確認してください。
                  </div>
                )
              ) : (
                <>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          メールアドレス <span className="text-gray-400">(任意)</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="example@email.com" {...field} />
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
                </>
              )}

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm text-blue-800">
                  <strong>📝 登録後について</strong>
                  <br />
                  {isPhoneIntake
                    ? returnsToReservation
                      ? '名前を登録すると、そのまま池袋の予約作成へ戻ります。その他の詳細情報は顧客詳細で後から追加できます。'
                      : '名前を登録すると顧客詳細へ進みます。その他の詳細情報はそこで追加できます。'
                    : '基本登録後、顧客詳細ページでメールアドレス、生年月日、会員タイプなどの詳細情報を追加できます。'}
                </p>
              </div>
            </CardContent>
          </Card>

          {form.formState.errors.root && (
            <div
              role="alert"
              aria-label="顧客登録エラー"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {form.formState.errors.root.message}
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-6">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || !registrationStore}
              className="bg-emerald-600 px-8 text-white hover:bg-emerald-700"
            >
              {form.formState.isSubmitting ? '登録中…' : '登録'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

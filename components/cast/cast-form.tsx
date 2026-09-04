'use client'

/**
 * @design_doc   Cast profile editing and secure account-boundary form
 * @related_to   CastManagePage; CastLineRegistrationPanel owns LINE account linking
 * @known_issues Additional private profile fields require an explicit persistence design
 */
import React, { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Cast } from '@/lib/cast/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { FormSection } from '@/components/cast/form-section'
import { resolveOptionId } from '@/lib/options/data'
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning'
import { getDesignationFees } from '@/lib/designation/data'
import type { DesignationFee } from '@/lib/designation/types'
import { resolveDesignationKind } from '@/lib/designation/kind'

const castFormSchema = z
  .object({
    name: z.string().trim().min(1, '源氏名を入力してください'),
    nameKana: z.string().trim().min(1, '本名（ひらがな）を入力してください'),
    loginEmail: z
      .string()
      .trim()
      .refine((value) => value.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
        message: '正しいメールアドレスを入力してください',
      }),
    loginPassword: z.string(),
    loginPasswordConfirm: z.string(),
  })
  .superRefine((value, context) => {
    const password = value.loginPassword.trim()
    const confirm = value.loginPasswordConfirm.trim()

    if (!password && !confirm) {
      return
    }

    if (password.length < 6) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['loginPassword'],
        message: 'パスワードは6文字以上で入力してください',
      })
    }

    if (password !== confirm) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['loginPasswordConfirm'],
        message: 'ログイン用パスワードが一致しません',
      })
    }
  })

type CastFormValidationValues = z.infer<typeof castFormSchema>
type CastFormValidationField = keyof CastFormValidationValues

export function validateCastFormInput(input: CastFormValidationValues) {
  return castFormSchema.safeParse(input)
}

interface CastFormProps {
  storeId: string
  cast?: Cast | null
  onSubmit: (data: Partial<Cast> & { loginPassword?: string | null }) => Promise<void> | void
  onCancel?: () => void
  isSubmitting?: boolean
}

const buildInitialFormState = (cast?: Cast | null) => ({
  name: cast?.name || '',
  nameKana: cast?.nameKana || '',
  age: cast?.age ?? '',
  height: cast?.height ?? '',
  bust: cast?.bust || '',
  waist: cast?.waist ?? '',
  hip: cast?.hip ?? '',
  type: cast?.type || 'カワイイ系',
  image: cast?.image || '',
  images: cast?.images ? [...cast.images] : [],
  description: cast?.description || '',
  mediaComment: cast?.mediaComment || '',
  mediaSyncExcluded: cast?.mediaSyncExcluded ?? false,
  netReservation: cast?.netReservation ?? true,
  specialDesignationFee: cast?.specialDesignationFee ?? '',
  specialDesignationFeeId: cast?.specialDesignationFeeId ?? '',
  panelTakeHomeBonusId: cast?.panelTakeHomeBonusId ?? '',
  regularTakeHomeBonusId: cast?.regularTakeHomeBonusId ?? '',
  freeTakeHomeBonusId: cast?.freeTakeHomeBonusId ?? '',
  recommendedTakeHomeBonusId: cast?.recommendedTakeHomeBonusId ?? '',
  panelDesignationRank: cast?.panelDesignationRank ?? '',
  regularDesignationRank: cast?.regularDesignationRank ?? '',
  workStatus: cast?.workStatus || '出勤',
  employmentStatus: cast?.employmentStatus || 'active',
  phone: cast?.phone ?? '',
  birthDate: cast?.birthDate ? new Date(cast.birthDate).toISOString().slice(0, 10) : '',
  blogWidget: cast?.blogWidget ?? '',
  snsAccount: cast?.snsAccount ?? '',
  joinedAt: cast?.joinedAt ? new Date(cast.joinedAt).toISOString().slice(0, 10) : '',
  retiredAt: cast?.retiredAt ? new Date(cast.retiredAt).toISOString().slice(0, 10) : '',
  interviewer: cast?.interviewer ?? '',
  recruitmentMedia: cast?.recruitmentMedia ?? '',
  photoIdVerifiedAt: cast?.photoIdVerifiedAt
    ? new Date(cast.photoIdVerifiedAt).toISOString().slice(0, 10)
    : '',
  residenceCertificateVerifiedAt: cast?.residenceCertificateVerifiedAt
    ? new Date(cast.residenceCertificateVerifiedAt).toISOString().slice(0, 10)
    : '',
  availableOptions: cast?.availableOptions ? [...cast.availableOptions] : [],
  availableOptionVisibility: (() => {
    const visibilityMap: Record<string, 'public' | 'internal'> = {}
    if (cast?.availableOptionSettings && cast.availableOptionSettings.length > 0) {
      cast.availableOptionSettings.forEach((entry) => {
        visibilityMap[entry.optionId] = entry.visibility
      })
    } else if (cast?.availableOptions) {
      cast.availableOptions.forEach((optionId) => {
        visibilityMap[optionId] = 'public'
      })
    }
    return visibilityMap
  })(),
  welfareExpenseRate:
    cast?.welfareExpenseRate !== undefined && cast?.welfareExpenseRate !== null
      ? String(cast.welfareExpenseRate)
      : '',
  loginEmail: cast?.loginEmail || '',
  loginPassword: '',
  loginPasswordConfirm: '',
})

const EMPLOYMENT_STATUS_OPTIONS: Array<{
  value: 'provisional' | 'active' | 'retired'
  label: string
}> = [
  { value: 'provisional', label: '仮登録' },
  { value: 'active', label: '在籍' },
  { value: 'retired', label: '退店' },
]

export function CastForm({
  storeId,
  cast,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CastFormProps) {
  const [formData, setFormData] = useState(() => buildInitialFormState(cast))
  const [designationFees, setDesignationFees] = useState<DesignationFee[]>([])
  const initialFormData = useMemo(() => buildInitialFormState(cast), [cast])
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showLoginPasswordConfirm, setShowLoginPasswordConfirm] = useState(false)
  const [interviewerOptions, setInterviewerOptions] = useState<string[]>([])
  const [recruitmentMediaOptions, setRecruitmentMediaOptions] = useState<string[]>([])
  const {
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<CastFormValidationValues>()
  const fieldId = (suffix: string) => `cast-${suffix}`
  useEffect(() => {
    let active = true
    getDesignationFees({ storeId })
      .then((fees) => {
        if (active) setDesignationFees(fees.filter((fee) => fee.isActive))
      })
      .catch((error) => console.error('Failed to load designation fee master:', error))
    return () => {
      active = false
    }
  }, [storeId])

  useEffect(() => {
    let active = true
    const storeQuery = `storeId=${encodeURIComponent(storeId)}`
    void Promise.all([
      fetch(`/api/admin?${storeQuery}`, { credentials: 'include', cache: 'no-store' }),
      fetch(`/api/settings/store?${storeQuery}`, { credentials: 'include', cache: 'no-store' }),
    ])
      .then(async ([adminsResponse, settingsResponse]) => {
        const adminsPayload = adminsResponse.ok ? await adminsResponse.json() : []
        const settingsPayload = settingsResponse.ok ? await settingsResponse.json() : {}
        const admins = Array.isArray(adminsPayload) ? adminsPayload : (adminsPayload?.data ?? [])
        const settings = settingsPayload?.data ?? settingsPayload
        if (!active) return
        setInterviewerOptions(
          Array.from(
            new Set(
              admins
                .map((admin: { name?: string; email?: string }) => admin.name || admin.email)
                .filter(Boolean)
            )
          ) as string[]
        )
        setRecruitmentMediaOptions(
          (Array.isArray(settings.mediaAccounts) ? settings.mediaAccounts : [])
            .filter((account: { category?: string }) => account.category === 'recruitment')
            .map((account: { name?: string }) => account.name)
            .filter(Boolean)
        )
      })
      .catch((error) => console.error('Failed to load cast form choices:', error))
    return () => {
      active = false
    }
  }, [storeId])

  const specialDesignationOptions = useMemo(() => {
    const options = designationFees.filter(
      (fee) => resolveDesignationKind(fee) === 'other' && fee.price > 0
    )
    const currentValue = Number(formData.specialDesignationFee || 0)
    if (currentValue > 0 && !options.some((fee) => fee.price === currentValue)) {
      options.push({
        id: `legacy-${currentValue}`,
        name: '現在の設定',
        price: currentValue,
        storeShare: 0,
        castShare: currentValue,
        sortOrder: Number.MAX_SAFE_INTEGER,
        isActive: true,
        kind: 'other',
      })
    }
    return options.sort((left, right) => left.sortOrder - right.sortOrder)
  }, [designationFees, formData.specialDesignationFee])
  const regularTakeHomeOptions = useMemo(
    () =>
      designationFees.filter((fee) => resolveDesignationKind(fee) === 'repeat' && fee.price > 0),
    [designationFees]
  )
  const freeTakeHomeOptions = useMemo(
    () => designationFees.filter((fee) => resolveDesignationKind(fee) === 'free' && fee.price > 0),
    [designationFees]
  )
  const panelTakeHomeOptions = useMemo(
    () => designationFees.filter((fee) => resolveDesignationKind(fee) === 'panel' && fee.price > 0),
    [designationFees]
  )
  const recommendedTakeHomeOptions = useMemo(
    () =>
      designationFees.filter((fee) => resolveDesignationKind(fee) === 'recommend' && fee.price > 0),
    [designationFees]
  )
  const isDirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(initialFormData),
    [formData, initialFormData]
  )
  useUnsavedChangesWarning(isDirty && !isSubmitting)

  useEffect(() => {
    setFormData(buildInitialFormState(cast))
  }, [cast])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    clearErrors()

    const validation = validateCastFormInput({
      name: formData.name,
      nameKana: formData.nameKana,
      loginEmail: formData.loginEmail,
      loginPassword: formData.loginPassword,
      loginPasswordConfirm: formData.loginPasswordConfirm,
    })

    if (!validation.success) {
      validation.error.issues.forEach((issue) => {
        const field = issue.path[0]
        if (
          field === 'name' ||
          field === 'nameKana' ||
          field === 'loginEmail' ||
          field === 'loginPassword' ||
          field === 'loginPasswordConfirm'
        ) {
          setError(field as CastFormValidationField, { message: issue.message })
        }
      })
      return
    }

    const toOptionalNumber = (value: number | string) => {
      if (value === '' || value === null || value === undefined) {
        return undefined
      }
      if (typeof value === 'number') return value
      const parsed = Number(value)
      return Number.isNaN(parsed) ? undefined : parsed
    }

    const toOptionalMoney = (value: number | string | null | undefined) => {
      if (value === '' || value === undefined) return undefined
      if (value === null) return null
      if (typeof value === 'number') return value
      const parsed = Number(value)
      if (Number.isNaN(parsed)) return undefined
      return parsed
    }

    const sanitizedImages = formData.images
      .map((url) => (typeof url === 'string' ? url.trim() : ''))
      .filter((url): url is string => Boolean(url && url.length > 0))
      .filter((value, index, array) => array.indexOf(value) === index)

    const loginEmail = formData.loginEmail?.trim() ?? ''
    const loginPassword = formData.loginPassword?.trim() ?? ''
    const loginPasswordConfirm = formData.loginPasswordConfirm?.trim() ?? ''

    const normalizedOptionSettings = formData.availableOptions
      .map((optionId) => ({
        optionId: resolveOptionId(optionId),
        visibility: formData.availableOptionVisibility?.[optionId] ?? 'public',
      }))
      .filter((entry) => entry.optionId.length > 0)

    const payload: Partial<Cast> = {
      name: formData.name.trim(),
      nameKana: formData.nameKana.trim(),
      bust: formData.bust.trim(),
      type: formData.type,
      description: formData.description.trim(),
      mediaComment: formData.mediaComment.trim(),
      mediaCommentSource: 'manual',
      mediaSyncExcluded: formData.mediaSyncExcluded,
      netReservation: formData.netReservation,
      images: sanitizedImages,
      workStatus: formData.workStatus,
      employmentStatus: formData.employmentStatus,
      specialDesignationFeeId: formData.specialDesignationFeeId || null,
      panelTakeHomeBonusId: formData.panelTakeHomeBonusId || null,
      regularTakeHomeBonusId: formData.regularTakeHomeBonusId || null,
      freeTakeHomeBonusId: formData.freeTakeHomeBonusId || null,
      recommendedTakeHomeBonusId: formData.recommendedTakeHomeBonusId || null,
      availableOptions: formData.availableOptions,
      availableOptionSettings: normalizedOptionSettings,
      phone: formData.phone.trim() || null,
      birthDate: formData.birthDate || null,
      blogWidget: formData.blogWidget.trim() || null,
      snsAccount: formData.snsAccount.trim() || null,
      joinedAt: formData.joinedAt || null,
      retiredAt: formData.retiredAt || null,
      interviewer: formData.interviewer || null,
      recruitmentMedia: formData.recruitmentMedia || null,
      photoIdVerifiedAt: formData.photoIdVerifiedAt || null,
      residenceCertificateVerifiedAt: formData.residenceCertificateVerifiedAt || null,
    }

    payload.loginEmail = loginEmail ? loginEmail : null

    const mainImage = formData.image.trim()
    if (mainImage) {
      payload.image = mainImage
      if (!sanitizedImages.includes(mainImage)) {
        sanitizedImages.unshift(mainImage)
      }
    }

    const age = toOptionalNumber(formData.age)
    if (age !== undefined) payload.age = age

    const height = toOptionalNumber(formData.height)
    if (height !== undefined) payload.height = height

    const waist = toOptionalNumber(formData.waist)
    if (waist !== undefined) payload.waist = waist

    const hip = toOptionalNumber(formData.hip)
    if (hip !== undefined) payload.hip = hip

    const panelRank = toOptionalNumber(formData.panelDesignationRank)
    if (panelRank !== undefined) payload.panelDesignationRank = panelRank

    const regularRank = toOptionalNumber(formData.regularDesignationRank)
    if (regularRank !== undefined) payload.regularDesignationRank = regularRank

    const specialFee = toOptionalMoney(formData.specialDesignationFee as number | string | null)
    if (specialFee !== undefined) payload.specialDesignationFee = specialFee

    const welfareRate = toOptionalNumber(formData.welfareExpenseRate)
    if (welfareRate !== undefined) payload.welfareExpenseRate = welfareRate

    onSubmit({
      ...payload,
      images: sanitizedImages,
      loginPassword: loginPassword ? loginPassword : undefined,
    })
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
      return
    }
    if (typeof window !== 'undefined') {
      window.history.back()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off" noValidate>
      <FormSection title="基本情報" description="在籍管理と本人確認に必要な情報です。">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={fieldId('name')}>
              源氏名{' '}
              <span className="text-red-600" aria-hidden="true">
                *
              </span>
            </Label>
            <Input
              id={fieldId('name')}
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="例：高橋 えみり"
              autoFocus
              required
              aria-required="true"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? fieldId('name-error') : undefined}
              autoComplete="tel"
            />
            {errors.name && (
              <p id={fieldId('name-error')} className="text-sm text-red-600">
                {errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('nameKana')}>
              本名（ひらがな）{' '}
              <span className="text-red-600" aria-hidden="true">
                *
              </span>
            </Label>
            <Input
              id={fieldId('nameKana')}
              name="nameKana"
              value={formData.nameKana}
              onChange={handleInputChange}
              placeholder="たかはし えみり"
              required
              aria-required="true"
              aria-invalid={Boolean(errors.nameKana)}
              aria-describedby={errors.nameKana ? fieldId('nameKana-error') : undefined}
              autoComplete="off"
            />
            {errors.nameKana && (
              <p id={fieldId('nameKana-error')} className="text-sm text-red-600">
                {errors.nameKana.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              サイト上には表示されませんが検索時に使用します。
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('phone')}>電話番号</Label>
            <Input
              id={fieldId('phone')}
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange}
            />
          </div>
          <div className="space-y-2">
            <Label>生年月日</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['year', 'month', 'day'] as const).map((part) => {
                const [year = '', month = '', day = ''] = formData.birthDate.split('-')
                const value = part === 'year' ? year : part === 'month' ? month : day
                const values =
                  part === 'year'
                    ? Array.from({ length: 83 }, (_, index) =>
                        String(new Date().getFullYear() - 18 - index)
                      )
                    : Array.from({ length: part === 'month' ? 12 : 31 }, (_, index) =>
                        String(index + 1).padStart(2, '0')
                      )
                return (
                  <Select
                    key={part}
                    value={value}
                    onValueChange={(nextValue) => {
                      const next = { year, month, day, [part]: nextValue }
                      setFormData((previous) => ({
                        ...previous,
                        birthDate:
                          next.year && next.month && next.day
                            ? `${next.year}-${next.month}-${next.day}`
                            : '',
                      }))
                    }}
                  >
                    <SelectTrigger
                      aria-label={`生年月日${part === 'year' ? '年' : part === 'month' ? '月' : '日'}`}
                    >
                      <SelectValue
                        placeholder={part === 'year' ? '年' : part === 'month' ? '月' : '日'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {values.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              })}
            </div>
            {formData.birthDate ? (
              <p className="text-xs text-muted-foreground">
                年齢:{' '}
                {Math.max(0, new Date().getFullYear() - Number(formData.birthDate.slice(0, 4)))}歳
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('blogWidget')}>ブログウィジェット</Label>
            <Input
              id={fieldId('blogWidget')}
              name="blogWidget"
              value={formData.blogWidget}
              onChange={handleInputChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('snsAccount')}>SNSアカウント</Label>
            <Input
              id={fieldId('snsAccount')}
              name="snsAccount"
              value={formData.snsAccount}
              onChange={handleInputChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('joinedAt')}>入店日</Label>
            <Input
              id={fieldId('joinedAt')}
              name="joinedAt"
              type="date"
              value={formData.joinedAt}
              onChange={handleInputChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('retiredAt')}>退店日</Label>
            <Input
              id={fieldId('retiredAt')}
              name="retiredAt"
              type="date"
              value={formData.retiredAt}
              onChange={handleInputChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('interviewer')}>面接担当者</Label>
            <Select
              value={formData.interviewer || 'none'}
              onValueChange={(value) =>
                setFormData((previous) => ({
                  ...previous,
                  interviewer: value === 'none' ? '' : value,
                }))
              }
            >
              <SelectTrigger id={fieldId('interviewer')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">未設定</SelectItem>
                {interviewerOptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('recruitmentMedia')}>求人媒体</Label>
            <Select
              value={formData.recruitmentMedia || 'none'}
              onValueChange={(value) =>
                setFormData((previous) => ({
                  ...previous,
                  recruitmentMedia: value === 'none' ? '' : value,
                }))
              }
            >
              <SelectTrigger id={fieldId('recruitmentMedia')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">未設定</SelectItem>
                {recruitmentMediaOptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('photoIdVerifiedAt')}>写真付き身分証確認日</Label>
            <Input
              id={fieldId('photoIdVerifiedAt')}
              name="photoIdVerifiedAt"
              type="date"
              value={formData.photoIdVerifiedAt}
              onChange={handleInputChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('residenceCertificateVerifiedAt')}>
              本籍地入り住民票確認日
            </Label>
            <Input
              id={fieldId('residenceCertificateVerifiedAt')}
              name="residenceCertificateVerifiedAt"
              type="date"
              value={formData.residenceCertificateVerifiedAt}
              onChange={handleInputChange}
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        title="アカウント情報"
        description="キャスト本人がマイページへログインするための認証情報です。"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={fieldId('loginEmail')}>ログイン用メールアドレス</Label>
            <Input
              id={fieldId('loginEmail')}
              name="loginEmail"
              type="email"
              value={formData.loginEmail}
              onChange={handleInputChange}
              placeholder="cast@example.com"
              autoComplete="off"
              aria-invalid={Boolean(errors.loginEmail)}
              aria-describedby={errors.loginEmail ? fieldId('loginEmail-error') : undefined}
            />
            {errors.loginEmail && (
              <p id={fieldId('loginEmail-error')} className="text-sm text-red-600">
                {errors.loginEmail.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              キャスト本人がログインする際に使用します。未設定の場合はログインできません。
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('loginPassword')}>新しいパスワード</Label>
            <div className="relative">
              <Input
                id={fieldId('loginPassword')}
                name="loginPassword"
                type={showLoginPassword ? 'text' : 'password'}
                value={formData.loginPassword}
                onChange={handleInputChange}
                placeholder="••••••••"
                autoComplete="new-password"
                className="pr-10"
                aria-invalid={Boolean(errors.loginPassword)}
                aria-describedby={errors.loginPassword ? fieldId('loginPassword-error') : undefined}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                onClick={() => setShowLoginPassword((prev) => !prev)}
                aria-label={showLoginPassword ? 'パスワードを隠す' : 'パスワードを表示'}
              >
                {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {errors.loginPassword && (
              <p id={fieldId('loginPassword-error')} className="text-sm text-red-600">
                {errors.loginPassword.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              変更が不要な場合は空欄のままにしてください。
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('loginPasswordConfirm')}>パスワード（確認）</Label>
            <div className="relative">
              <Input
                id={fieldId('loginPasswordConfirm')}
                name="loginPasswordConfirm"
                type={showLoginPasswordConfirm ? 'text' : 'password'}
                value={formData.loginPasswordConfirm}
                onChange={handleInputChange}
                placeholder="••••••••"
                autoComplete="new-password"
                className="pr-10"
                aria-invalid={Boolean(errors.loginPasswordConfirm)}
                aria-describedby={
                  errors.loginPasswordConfirm ? fieldId('loginPasswordConfirm-error') : undefined
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                onClick={() => setShowLoginPasswordConfirm((prev) => !prev)}
                aria-label={
                  showLoginPasswordConfirm ? '確認用パスワードを隠す' : '確認用パスワードを表示'
                }
              >
                {showLoginPasswordConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.loginPasswordConfirm && (
              <p id={fieldId('loginPasswordConfirm-error')} className="text-sm text-red-600">
                {errors.loginPasswordConfirm.message}
              </p>
            )}
          </div>
        </div>
      </FormSection>

      <FormSection
        title="稼働・料金設定"
        description="出勤可否や指名料、ランク情報などの管理項目です。"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
            <div>
              <Label htmlFor={fieldId('netReservation')} className="text-sm font-medium">
                ネット予約
              </Label>
              <p className="text-xs text-muted-foreground">
                オンラインからの予約を受け付ける場合はオンにします。
              </p>
            </div>
            <Switch
              id={fieldId('netReservation')}
              checked={formData.netReservation}
              onCheckedChange={(checked) => handleSwitchChange('netReservation', checked)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('employmentStatus')}>在籍ステータス</Label>
            <Select
              value={formData.employmentStatus}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  employmentStatus: value as 'provisional' | 'active' | 'retired',
                }))
              }
            >
              <SelectTrigger id={fieldId('employmentStatus')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('welfareExpenseRate')}>厚生費率 (%)</Label>
            <Input
              id={fieldId('welfareExpenseRate')}
              name="welfareExpenseRate"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={formData.welfareExpenseRate}
              onChange={handleInputChange}
              placeholder="10"
            />
            <p className="text-xs text-muted-foreground">
              コース料金に対する厚生費の割合です。未設定の場合は店舗既定値が適用されます。
            </p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={fieldId('specialDesignationFee')}>特別指名料ランク</Label>
            <Select
              value={
                formData.specialDesignationFeeId ||
                specialDesignationOptions.find(
                  (fee) => fee.price === Number(formData.specialDesignationFee || 0)
                )?.id ||
                'none'
              }
              onValueChange={(value) => {
                const selected = specialDesignationOptions.find((fee) => fee.id === value)
                setFormData((previous) => ({
                  ...previous,
                  specialDesignationFeeId:
                    selected && !selected.id.startsWith('legacy-') ? selected.id : '',
                  specialDesignationFee: selected?.price ?? 0,
                }))
              }}
            >
              <SelectTrigger id={fieldId('specialDesignationFee')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">なし（0円）</SelectItem>
                {specialDesignationOptions.map((fee) => (
                  <SelectItem key={fee.id} value={fee.id}>
                    {fee.name}（{fee.price.toLocaleString()}円）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              指名料設定で作成した名称・金額から選択します。
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('freeTakeHomeBonus')}>フリー指名手取UP</Label>
            <Select
              value={formData.freeTakeHomeBonusId || 'none'}
              onValueChange={(value) =>
                setFormData((previous) => ({
                  ...previous,
                  freeTakeHomeBonusId: value === 'none' ? '' : value,
                }))
              }
            >
              <SelectTrigger id={fieldId('freeTakeHomeBonus')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">なし（0円）</SelectItem>
                {freeTakeHomeOptions.map((fee) => (
                  <SelectItem key={fee.id} value={fee.id}>
                    {fee.name}（{fee.price.toLocaleString()}円）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('panelTakeHomeBonus')}>パネル指名手取UP</Label>
            <Select
              value={formData.panelTakeHomeBonusId || 'none'}
              onValueChange={(value) =>
                setFormData((previous) => ({
                  ...previous,
                  panelTakeHomeBonusId: value === 'none' ? '' : value,
                }))
              }
            >
              <SelectTrigger id={fieldId('panelTakeHomeBonus')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">なし（0円）</SelectItem>
                {panelTakeHomeOptions.map((fee) => (
                  <SelectItem key={fee.id} value={fee.id}>
                    {fee.name}（{fee.price.toLocaleString()}円）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('recommendedTakeHomeBonus')}>おすすめP指名手取UP</Label>
            <Select
              value={formData.recommendedTakeHomeBonusId || 'none'}
              onValueChange={(value) =>
                setFormData((previous) => ({
                  ...previous,
                  recommendedTakeHomeBonusId: value === 'none' ? '' : value,
                }))
              }
            >
              <SelectTrigger id={fieldId('recommendedTakeHomeBonus')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">なし（0円）</SelectItem>
                {recommendedTakeHomeOptions.map((fee) => (
                  <SelectItem key={fee.id} value={fee.id}>
                    {fee.name}（{fee.price.toLocaleString()}円）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('regularTakeHomeBonus')}>本指名手取UP</Label>
            <Select
              value={formData.regularTakeHomeBonusId || 'none'}
              onValueChange={(value) =>
                setFormData((previous) => ({
                  ...previous,
                  regularTakeHomeBonusId: value === 'none' ? '' : value,
                }))
              }
            >
              <SelectTrigger id={fieldId('regularTakeHomeBonus')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">なし（0円）</SelectItem>
                {regularTakeHomeOptions.map((fee) => (
                  <SelectItem key={fee.id} value={fee.id}>
                    {fee.name}（{fee.price.toLocaleString()}円）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormSection>

      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          className="sm:min-w-[120px]"
          disabled={isSubmitting}
        >
          キャンセル
        </Button>
        <Button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-700 sm:min-w-[160px]"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            '保存'
          )}
        </Button>
      </div>
    </form>
  )
}

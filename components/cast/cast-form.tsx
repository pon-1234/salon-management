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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ArrowDown, ArrowUp, Plus, Loader2, Eye, EyeOff } from 'lucide-react'
import { ImageUpload } from '@/components/ui/image-upload'
import { SafeImage } from '@/components/ui/safe-image'
import { FormSection } from '@/components/cast/form-section'
import { cn } from '@/lib/utils'
import { usePricing } from '@/hooks/use-pricing'
import { resolveOptionId } from '@/lib/options/data'
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning'
import { moveGalleryImage } from '@/lib/cast/gallery-order'
import { getDesignationFees } from '@/lib/designation/data'
import type { DesignationFee } from '@/lib/designation/types'
import { resolveDesignationKind } from '@/lib/designation/kind'

type OptionChoice = {
  id: string
  name: string
  price: number
  description?: string
  note?: string | null
  storeShare?: number | null
  castShare?: number | null
}

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
  regularDesignationFee: cast?.regularDesignationFee ?? '',
  panelDesignationRank: cast?.panelDesignationRank ?? '',
  regularDesignationRank: cast?.regularDesignationRank ?? '',
  workStatus: cast?.workStatus || '出勤',
  employmentStatus: cast?.employmentStatus || 'provisional',
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

const PROFILE_TYPES = [
  'カワイイ系',
  'キレイ系',
  'セクシー系',
  'お姉さん系',
  'モデル系',
  'おっとり系',
]

const WORK_STATUS_OPTIONS: Cast['workStatus'][] = ['出勤', '未出勤', '休日']
const EMPLOYMENT_STATUS_OPTIONS: Array<{
  value: 'provisional' | 'active' | 'retired'
  label: string
}> = [
  { value: 'provisional', label: '仮登録' },
  { value: 'active', label: '在籍' },
  { value: 'retired', label: '退店' },
]

const OptionPill = ({
  label,
  caption,
  description,
  note,
  selected,
  onToggle,
  visibility,
  onVisibilityChange,
}: {
  label: string
  caption?: string
  description?: string
  note?: string | null
  selected: boolean
  onToggle: () => void
  visibility?: 'public' | 'internal'
  onVisibilityChange?: (value: 'public' | 'internal') => void
}) => (
  <div
    className={cn(
      'w-full rounded-lg border px-4 py-3 text-left text-sm transition',
      selected
        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
        : 'border-border hover:border-emerald-400 hover:bg-emerald-50'
    )}
  >
    <button type="button" onClick={onToggle} className="w-full text-left">
      <span className="block font-medium">{label}</span>
      {note ? (
        <span className="mt-1 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
          {note}
        </span>
      ) : null}
      {description ? (
        <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
      ) : null}
      {caption ? <span className="mt-1 block text-xs text-muted-foreground">{caption}</span> : null}
    </button>
    {selected && onVisibilityChange ? (
      <div className="mt-2 flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">公開設定</span>
        <Select
          value={visibility ?? 'public'}
          onValueChange={(value) => onVisibilityChange(value as 'public' | 'internal')}
        >
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">公開</SelectItem>
            <SelectItem value="internal">準非公開</SelectItem>
          </SelectContent>
        </Select>
      </div>
    ) : null}
  </div>
)

const DEFAULT_STORE_RATIO = 0.6

function calculateRevenueSplit(
  price: number,
  storeShare?: number | null,
  castShare?: number | null
) {
  const safePrice = Math.max(0, price || 0)
  let store = typeof storeShare === 'number' ? Math.max(0, storeShare) : Number.NaN
  let cast = typeof castShare === 'number' ? Math.max(0, castShare) : Number.NaN

  if (Number.isNaN(store) && Number.isNaN(cast)) {
    store = Math.round(safePrice * DEFAULT_STORE_RATIO)
    cast = Math.max(safePrice - store, 0)
  } else if (Number.isNaN(store)) {
    cast = Math.min(safePrice, cast)
    store = Math.max(safePrice - cast, 0)
  } else if (Number.isNaN(cast)) {
    store = Math.min(safePrice, store)
    cast = Math.max(safePrice - store, 0)
  } else {
    store = Math.min(store, safePrice)
    cast = Math.max(safePrice - store, 0)
  }

  return { storeShare: store, castShare: cast }
}

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
  const {
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<CastFormValidationValues>()
  const fieldId = (suffix: string) => `cast-${suffix}`
  const { optionPrices, options: legacyOptions, loading: optionsLoading } = usePricing(storeId)
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
  const panelTakeHomeOptions = useMemo(
    () => designationFees.filter((fee) => resolveDesignationKind(fee) === 'panel' && fee.price > 0),
    [designationFees]
  )
  const regularTakeHomeOptions = useMemo(
    () =>
      designationFees.filter((fee) => resolveDesignationKind(fee) === 'repeat' && fee.price > 0),
    [designationFees]
  )
  const isDirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(initialFormData),
    [formData, initialFormData]
  )
  useUnsavedChangesWarning(isDirty && !isSubmitting)

  const optionCatalog: OptionChoice[] = useMemo(() => {
    if (optionPrices.length > 0) {
      return optionPrices
        .filter((option) => option.isActive !== false)
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((option) => ({
          id: option.id,
          name: option.name,
          price: option.price,
          description: option.description ?? '',
          note: option.note ?? null,
          storeShare: option.storeShare ?? null,
          castShare: option.castShare ?? null,
        }))
    }

    if (legacyOptions.length > 0) {
      return legacyOptions.map((option) => ({
        id: option.id,
        name: option.name,
        price: option.price,
        description: option.description ?? '',
        note: option.note ?? null,
        storeShare: option.storeShare ?? null,
        castShare: option.castShare ?? null,
      }))
    }

    return []
  }, [optionPrices, legacyOptions])

  useEffect(() => {
    setFormData(buildInitialFormState(cast))
  }, [cast])

  useEffect(() => {
    setFormData((prev) => {
      if (prev.availableOptions.length === 0) {
        return prev
      }

      const normalized = prev.availableOptions.map((id) => resolveOptionId(id))
      const hasChanged = normalized.some((id, index) => id !== prev.availableOptions[index])

      if (!hasChanged) {
        return prev
      }

      const normalizedVisibility: Record<string, 'public' | 'internal'> = {}
      Object.entries(prev.availableOptionVisibility ?? {}).forEach(([key, value]) => {
        const resolved = resolveOptionId(key)
        normalizedVisibility[resolved] = value === 'internal' ? 'internal' : 'public'
      })

      return {
        ...prev,
        availableOptions: Array.from(new Set(normalized)),
        availableOptionVisibility: normalizedVisibility,
      }
    })
  }, [optionCatalog])

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
      availableOptions: formData.availableOptions,
      availableOptionSettings: normalizedOptionSettings,
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

    const regularFee = toOptionalMoney(formData.regularDesignationFee as number | string | null)
    if (regularFee !== undefined) payload.regularDesignationFee = regularFee

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

  const handleWorkStatusChange = (value: string) => {
    if (WORK_STATUS_OPTIONS.includes(value as Cast['workStatus'])) {
      setFormData((prev) => ({ ...prev, workStatus: value as Cast['workStatus'] }))
    }
  }

  const handleOptionChange = (optionId: string, checked: boolean) => {
    setFormData((prev) => {
      const filtered = prev.availableOptions.filter((id) => {
        const resolved = resolveOptionId(id)
        return resolved !== optionId && id !== optionId
      })

      if (checked) {
        filtered.push(optionId)
        return {
          ...prev,
          availableOptions: Array.from(new Set(filtered)),
          availableOptionVisibility: {
            ...prev.availableOptionVisibility,
            [optionId]: prev.availableOptionVisibility?.[optionId] ?? 'public',
          },
        }
      }
      const nextVisibility = { ...(prev.availableOptionVisibility ?? {}) }
      delete nextVisibility[optionId]
      return {
        ...prev,
        availableOptions: Array.from(new Set(filtered)),
        availableOptionVisibility: nextVisibility,
      }
    })
  }

  const handleImageChange = (index: number, url: string) => {
    setFormData((prev) => {
      const trimmedUrl = url.trim()
      const newImages = [...prev.images]
      newImages[index] = trimmedUrl

      const currentMain = prev.image?.trim() ?? ''
      const isDefaultMain =
        !currentMain || currentMain.includes('placeholder') || currentMain === prev.images[index]
      const nextMain = isDefaultMain && trimmedUrl ? trimmedUrl : currentMain

      return {
        ...prev,
        images: newImages,
        image: nextMain ?? '',
      }
    })
  }

  const addImage = () => {
    setFormData((prev) => {
      if (prev.images.length >= 10) return prev
      return {
        ...prev,
        images: [...prev.images, ''],
      }
    })
  }

  const removeImage = (index: number) => {
    setFormData((prev) => {
      const removedValue = prev.images[index]?.trim()
      const newImages = prev.images.filter((_, i) => i !== index)
      const nextMain =
        prev.image && removedValue && prev.image.trim() === removedValue
          ? (newImages.find((img) => (img ?? '').trim().length > 0) ?? '')
          : prev.image
      return {
        ...prev,
        images: newImages,
        image: nextMain ?? '',
      }
    })
  }

  const moveImage = (index: number, offset: -1 | 1) => {
    setFormData((prev) => ({
      ...prev,
      images: moveGalleryImage(prev.images, index, offset),
    }))
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
      <FormSection
        title="基本プロフィール"
        description="公開プロフィールで表示されるキャストの基礎情報を整えます。"
      >
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
            <Label htmlFor={fieldId('age')}>年齢</Label>
            <Input
              id={fieldId('age')}
              name="age"
              type="number"
              min={18}
              value={formData.age}
              onChange={handleInputChange}
              placeholder="25"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('height')}>身長 (cm)</Label>
            <Input
              id={fieldId('height')}
              name="height"
              type="number"
              min={100}
              value={formData.height}
              onChange={handleInputChange}
              placeholder="168"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('bust')}>バスト</Label>
            <Input
              id={fieldId('bust')}
              name="bust"
              value={formData.bust}
              onChange={handleInputChange}
              placeholder="84"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('waist')}>ウエスト (cm)</Label>
            <Input
              id={fieldId('waist')}
              name="waist"
              type="number"
              value={formData.waist}
              onChange={handleInputChange}
              placeholder="60"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('hip')}>ヒップ (cm)</Label>
            <Input
              id={fieldId('hip')}
              name="hip"
              type="number"
              value={formData.hip}
              onChange={handleInputChange}
              placeholder="88"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('type')}>タイプ</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
            >
              <SelectTrigger id={fieldId('type')}>
                <SelectValue placeholder="スタイルを選択" />
              </SelectTrigger>
              <SelectContent>
                {PROFILE_TYPES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={fieldId('description')}>紹介文</Label>
          <Textarea
            id={fieldId('description')}
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="キャストの雰囲気や得意なサービスなどを記載します。"
            className="min-h-[120px]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={fieldId('mediaComment')}>媒体掲載用コメント</Label>
          <Textarea
            id={fieldId('mediaComment')}
            name="mediaComment"
            value={formData.mediaComment}
            onChange={handleInputChange}
            placeholder="ヘブン・便利など外部媒体向けのコメント。店舗内部の備考とは別に保存されます。"
            className="min-h-[120px]"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="mediaSyncExcluded"
              checked={formData.mediaSyncExcluded}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, mediaSyncExcluded: event.target.checked }))
              }
            />
            外部サービスからのコメント同期対象外にする
          </label>
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
            <Label htmlFor={fieldId('workStatus')}>稼働ステータス</Label>
            <Select value={formData.workStatus} onValueChange={handleWorkStatusChange}>
              <SelectTrigger id={fieldId('workStatus')}>
                <SelectValue placeholder="稼働ステータスを選択" />
              </SelectTrigger>
              <SelectContent>
                {WORK_STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Label htmlFor={fieldId('regularDesignationFee')}>本指名料 (円)</Label>
            <Input
              id={fieldId('regularDesignationFee')}
              name="regularDesignationFee"
              type="number"
              min={0}
              value={formData.regularDesignationFee}
              onChange={handleInputChange}
              placeholder="4000"
            />
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

      <FormSection
        title="メイン画像・ギャラリー"
        description="アイキャッチ画像とギャラリー画像を設定します。3枚以上の登録がおすすめです。"
      >
        <div className="space-y-2">
          <Label htmlFor={fieldId('image')}>メイン画像URL</Label>
          <Input
            id={fieldId('image')}
            name="image"
            value={formData.image}
            onChange={handleInputChange}
            placeholder="https://example.com/main.jpg"
            autoComplete="off"
          />
          {formData.image ? (
            <div className="flex items-center gap-4 rounded-lg border bg-muted/40 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <SafeImage
                src={formData.image}
                alt="メイン画像プレビュー"
                className="h-20 w-16 flex-shrink-0 rounded object-cover"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground">現在のメイン画像</p>
                <p className="truncate text-xs text-muted-foreground">{formData.image}</p>
              </div>
            </div>
          ) : null}
        </div>
        <div className={cn('grid gap-4', formData.images.length > 0 ? 'md:grid-cols-2' : '')}>
          {formData.images.length === 0 && (
            <p className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              画像を追加するとここにプレビューが表示されます。
            </p>
          )}
          {formData.images.map((image, index) => (
            <div key={index} className="space-y-2">
              <ImageUpload
                value={image}
                onChange={(url) => handleImageChange(index, url)}
                onRemove={() => removeImage(index)}
                index={index}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={`画像${index + 1}を前へ`}
                  disabled={index === 0}
                  onClick={() => moveImage(index, -1)}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={`画像${index + 1}を後ろへ`}
                  disabled={index === formData.images.length - 1}
                  onClick={() => moveImage(index, 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        {formData.images.length < 10 && (
          <Button type="button" variant="outline" onClick={addImage} className="w-full sm:w-fit">
            <Plus className="mr-2 h-4 w-4" />
            画像を追加 ({formData.images.length}/10)
          </Button>
        )}
      </FormSection>

      <FormSection
        title="提供可能オプション"
        description="実施可能なオプションを選択し、公開/準非公開を設定できます。"
      >
        {optionsLoading && optionCatalog.length === 0 ? (
          <p className="text-sm text-muted-foreground">オプション情報を読み込み中です…</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {optionCatalog.map((option) => {
              const selected = formData.availableOptions.some((value) => {
                const resolved = resolveOptionId(value)
                return value === option.id || resolved === option.id
              })
              const visibility = formData.availableOptionVisibility?.[option.id] ?? 'public'
              const { storeShare, castShare } = calculateRevenueSplit(
                option.price,
                option.storeShare,
                option.castShare
              )

              const caption =
                option.price === 0
                  ? `無料 / 店舗 ${storeShare.toLocaleString()}円 / キャスト ${castShare.toLocaleString()}円`
                  : `料金 ¥${option.price.toLocaleString()} / 店舗 ${storeShare.toLocaleString()}円 / キャスト ${castShare.toLocaleString()}円`

              return (
                <OptionPill
                  key={option.id}
                  label={option.name}
                  description={option.description}
                  note={option.note}
                  caption={caption}
                  selected={selected}
                  onToggle={() => handleOptionChange(option.id, !selected)}
                  visibility={visibility}
                  onVisibilityChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      availableOptionVisibility: {
                        ...(prev.availableOptionVisibility ?? {}),
                        [option.id]: value,
                      },
                    }))
                  }
                />
              )
            })}
          </div>
        )}
        {optionCatalog.length === 0 && !optionsLoading ? (
          <p className="text-sm text-muted-foreground">登録済みのオプションがありません</p>
        ) : null}
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

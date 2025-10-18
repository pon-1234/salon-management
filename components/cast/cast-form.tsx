'use client'

import React, { useEffect, useMemo, useState } from 'react'
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
import { Plus, Loader2 } from 'lucide-react'
import { ImageUpload } from '@/components/ui/image-upload'
import { FormSection } from '@/components/cast/form-section'
import { cn } from '@/lib/utils'
import { usePricing } from '@/hooks/use-pricing'
import { resolveOptionId } from '@/lib/options/data'

type OptionChoice = {
  id: string
  name: string
  price: number
  description?: string
  note?: string | null
  storeShare?: number | null
  castShare?: number | null
}

interface CastFormProps {
  cast?: Cast | null
  onSubmit: (data: Partial<Cast>) => Promise<void> | void
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
  netReservation: cast?.netReservation ?? true,
  specialDesignationFee: cast?.specialDesignationFee ?? '',
  regularDesignationFee: cast?.regularDesignationFee ?? '',
  panelDesignationRank: cast?.panelDesignationRank ?? '',
  regularDesignationRank: cast?.regularDesignationRank ?? '',
  workStatus: cast?.workStatus || '出勤',
  availableOptions: cast?.availableOptions ? [...cast.availableOptions] : [],
  phone: '',
  email: '',
  password: '',
  birthDate: '',
  registrationDate: new Date().toISOString().split('T')[0],
  blogId: '',
  twitterId: '',
})

const PROFILE_TYPES = [
  'カワイイ系',
  'キレイ系',
  'セクシー系',
  'お姉さん系',
  'モデル系',
  'おっとり系',
]

const WORK_STATUS_OPTIONS: Cast['workStatus'][] = ['出勤', '未出勤']

const OptionPill = ({
  label,
  caption,
  description,
  note,
  selected,
  onToggle,
}: {
  label: string
  caption?: string
  description?: string
  note?: string | null
  selected: boolean
  onToggle: () => void
}) => (
  <button
    type="button"
    onClick={onToggle}
    className={cn(
      'w-full rounded-lg border px-4 py-3 text-left text-sm transition',
      selected
        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
        : 'border-border hover:border-emerald-400 hover:bg-emerald-50'
    )}
  >
    <span className="block font-medium">{label}</span>
    {note ? (
      <span className="mt-1 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
        {note}
      </span>
    ) : null}
    {description ? (
      <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
    ) : null}
    {caption ? (
      <span className="mt-1 block text-xs text-muted-foreground">{caption}</span>
    ) : null}
  </button>
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

export function CastForm({ cast, onSubmit, onCancel, isSubmitting = false }: CastFormProps) {
  const [formData, setFormData] = useState(() => buildInitialFormState(cast))
  const fieldId = (suffix: string) => `cast-${suffix}`
  const { optionPrices, options: legacyOptions, loading: optionsLoading } = usePricing()

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

      return {
        ...prev,
        availableOptions: Array.from(new Set(normalized)),
      }
    })
  }, [optionCatalog])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

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

    const payload: Partial<Cast> = {
      name: formData.name.trim(),
      nameKana: formData.nameKana.trim(),
      bust: formData.bust.trim(),
      type: formData.type,
      description: formData.description.trim(),
      netReservation: formData.netReservation,
      images: sanitizedImages,
      workStatus: formData.workStatus,
      availableOptions: formData.availableOptions,
    }

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

    onSubmit({
      ...payload,
      images: sanitizedImages,
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

  const handleOptionChange = (optionId: string, checked: boolean) => {
    setFormData((prev) => {
      const filtered = prev.availableOptions.filter((id) => {
        const resolved = resolveOptionId(id)
        return resolved !== optionId && id !== optionId
      })

      if (checked) {
        filtered.push(optionId)
      }

      return {
        ...prev,
        availableOptions: Array.from(new Set(filtered)),
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
          ? newImages.find((img) => (img ?? '').trim().length > 0) ?? ''
          : prev.image
      return {
        ...prev,
        images: newImages,
        image: nextMain ?? '',
      }
    })
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
    <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
      <FormSection
        title="基本プロフィール"
        description="公開プロフィールで表示されるキャストの基礎情報を整えます。"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={fieldId('name')}>源氏名</Label>
            <Input
              id={fieldId('name')}
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="例：高橋 えみり"
              required
              autoComplete="tel"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('nameKana')}>本名（ひらがな）</Label>
            <Input
              id={fieldId('nameKana')}
              name="nameKana"
              value={formData.nameKana}
              onChange={handleInputChange}
              placeholder="たかはし えみり"
              required
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">サイト上には表示されませんが検索時に使用します。</p>
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
            <Select
              value={formData.workStatus}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, workStatus: value }))}
            >
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
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={fieldId('specialDesignationFee')}>特別指名料 (円)</Label>
            <Input
              id={fieldId('specialDesignationFee')}
              name="specialDesignationFee"
              type="number"
              min={0}
              value={formData.specialDesignationFee}
              onChange={handleInputChange}
              placeholder="8000"
            />
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
            <Label htmlFor={fieldId('panelDesignationRank')}>パネル指名ランク</Label>
            <Input
              id={fieldId('panelDesignationRank')}
              name="panelDesignationRank"
              type="number"
              min={0}
              value={formData.panelDesignationRank}
              onChange={handleInputChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('regularDesignationRank')}>本指名ランク</Label>
            <Input
              id={fieldId('regularDesignationRank')}
              name="regularDesignationRank"
              type="number"
              min={0}
              value={formData.regularDesignationRank}
              onChange={handleInputChange}
            />
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
              <img
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
            <ImageUpload
              key={index}
              value={image}
              onChange={(url) => handleImageChange(index, url)}
              onRemove={() => removeImage(index)}
              index={index}
            />
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
        title="連絡先・管理メモ"
        description="社内共有用の情報としてご活用ください（任意入力）。"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={fieldId('phone')}>TEL</Label>
            <Input
              id={fieldId('phone')}
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="090-1234-5678"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('email')}>メール</Label>
            <Input
              id={fieldId('email')}
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="staff@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('twitterId')}>Twitter / X</Label>
            <Input
              id={fieldId('twitterId')}
              name="twitterId"
              value={formData.twitterId}
              onChange={handleInputChange}
              placeholder="@example"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('blogId')}>ブログウィジェット</Label>
            <Input
              id={fieldId('blogId')}
              name="blogId"
              value={formData.blogId}
              onChange={handleInputChange}
              placeholder="ブログ埋め込みコードなど"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('password')}>パスワード</Label>
            <Input
              id={fieldId('password')}
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="管理用パスワード"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('birthDate')}>生年月日</Label>
            <Input
              id={fieldId('birthDate')}
              name="birthDate"
              type="date"
              value={formData.birthDate}
              onChange={handleInputChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('registrationDate')}>登録日</Label>
            <Input
              id={fieldId('registrationDate')}
              name="registrationDate"
              type="date"
              value={formData.registrationDate}
              onChange={handleInputChange}
              disabled
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        title="提供可能オプション"
        description="実施可能なオプションを選択すると、予約画面の提案にも反映されます。"
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
              const { storeShare, castShare } = calculateRevenueSplit(
                option.price,
                option.storeShare,
                option.castShare
              )

              const caption = option.price === 0
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

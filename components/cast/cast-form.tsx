'use client'

import React, { useEffect, useState } from 'react'
import { Cast } from '@/lib/cast/types'
import { options } from '@/lib/course-option/data'
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
import { Plus } from 'lucide-react'
import { ImageUpload } from '@/components/ui/image-upload'
import { FormSection } from '@/components/cast/form-section'
import { cn } from '@/lib/utils'

interface CastFormProps {
  cast?: Cast | null
  onSubmit: (data: Partial<Cast>) => void
  onCancel?: () => void
}

const buildInitialFormState = (cast?: Cast | null) => ({
  name: cast?.name || '',
  nameKana: cast?.nameKana || '',
  age: cast?.age || '',
  height: cast?.height || '',
  bust: cast?.bust || '',
  waist: cast?.waist || '',
  hip: cast?.hip || '',
  type: cast?.type || 'カワイイ系',
  image: cast?.image || '',
  images: cast?.images ? [...cast.images] : [],
  description: cast?.description || '',
  netReservation: cast?.netReservation ?? true,
  specialDesignationFee: cast?.specialDesignationFee ?? '',
  regularDesignationFee: cast?.regularDesignationFee ?? '',
  panelDesignationRank: cast?.panelDesignationRank || 0,
  regularDesignationRank: cast?.regularDesignationRank || 0,
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
  selected,
  onToggle,
}: {
  label: string
  caption?: string
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
    {caption ? <span className="mt-1 block text-xs text-muted-foreground">{caption}</span> : null}
  </button>
)

export function CastForm({ cast, onSubmit, onCancel }: CastFormProps) {
  const [formData, setFormData] = useState(() => buildInitialFormState(cast))

  useEffect(() => {
    setFormData(buildInitialFormState(cast))
  }, [cast])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const toNumber = (value: number | string) =>
      typeof value === 'string' ? parseInt(value, 10) || 0 : value

    const toMoney = (value: number | string | null) => {
      if (value === null) return null
      if (typeof value === 'string') {
        const parsed = parseInt(value, 10)
        return Number.isNaN(parsed) ? null : parsed
      }
      return value
    }

    const sanitizedImages = formData.images
      .map((url) => (typeof url === 'string' ? url.trim() : url))
      .filter((url) => typeof url === 'string' && url.length > 0)

    onSubmit({
      name: formData.name.trim(),
      nameKana: formData.nameKana.trim(),
      age: toNumber(formData.age),
      height: toNumber(formData.height),
      bust: formData.bust,
      waist: toNumber(formData.waist),
      hip: toNumber(formData.hip),
      type: formData.type,
      image: formData.image.trim(),
      images: sanitizedImages,
      description: formData.description,
      netReservation: formData.netReservation,
      specialDesignationFee: toMoney(formData.specialDesignationFee as number | string | null),
      regularDesignationFee: toMoney(formData.regularDesignationFee as number | string | null),
      panelDesignationRank: toNumber(formData.panelDesignationRank),
      regularDesignationRank: toNumber(formData.regularDesignationRank),
      workStatus: formData.workStatus,
      availableOptions: formData.availableOptions,
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
    setFormData((prev) => ({
      ...prev,
      availableOptions: checked
        ? [...prev.availableOptions, optionId]
        : prev.availableOptions.filter((id) => id !== optionId),
    }))
  }

  const handleImageChange = (index: number, url: string) => {
    setFormData((prev) => {
      const newImages = [...prev.images]
      newImages[index] = url
      return { ...prev, images: newImages }
    })
  }

  const addImage = () => {
    if (formData.images.length < 10) {
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ''],
      }))
    }
  }

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormSection
        title="基本プロフィール"
        description="公開プロフィールで表示されるキャストの基礎情報を整えます。"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">源氏名</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="例：高橋 えみり"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nameKana">本名（ひらがな）</Label>
            <Input
              id="nameKana"
              name="nameKana"
              value={formData.nameKana}
              onChange={handleInputChange}
              placeholder="たかはし えみり"
              required
            />
            <p className="text-xs text-muted-foreground">サイト上には表示されませんが検索時に使用します。</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="age">年齢</Label>
            <Input
              id="age"
              name="age"
              type="number"
              min={18}
              value={formData.age}
              onChange={handleInputChange}
              placeholder="25"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height">身長 (cm)</Label>
            <Input
              id="height"
              name="height"
              type="number"
              min={100}
              value={formData.height}
              onChange={handleInputChange}
              placeholder="168"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bust">バスト</Label>
            <Input
              id="bust"
              name="bust"
              value={formData.bust}
              onChange={handleInputChange}
              placeholder="84"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="waist">ウエスト (cm)</Label>
            <Input
              id="waist"
              name="waist"
              type="number"
              value={formData.waist}
              onChange={handleInputChange}
              placeholder="60"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hip">ヒップ (cm)</Label>
            <Input
              id="hip"
              name="hip"
              type="number"
              value={formData.hip}
              onChange={handleInputChange}
              placeholder="88"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">タイプ</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
            >
              <SelectTrigger id="type">
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
          <Label htmlFor="description">紹介文</Label>
          <Textarea
            id="description"
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
              <Label htmlFor="netReservation" className="text-sm font-medium">
                ネット予約
              </Label>
              <p className="text-xs text-muted-foreground">
                オンラインからの予約を受け付ける場合はオンにします。
              </p>
            </div>
            <Switch
              id="netReservation"
              checked={formData.netReservation}
              onCheckedChange={(checked) => handleSwitchChange('netReservation', checked)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workStatus">稼働ステータス</Label>
            <Select
              value={formData.workStatus}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, workStatus: value }))}
            >
              <SelectTrigger id="workStatus">
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
            <Label htmlFor="specialDesignationFee">特別指名料 (円)</Label>
            <Input
              id="specialDesignationFee"
              name="specialDesignationFee"
              type="number"
              min={0}
              value={formData.specialDesignationFee}
              onChange={handleInputChange}
              placeholder="8000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="regularDesignationFee">本指名料 (円)</Label>
            <Input
              id="regularDesignationFee"
              name="regularDesignationFee"
              type="number"
              min={0}
              value={formData.regularDesignationFee}
              onChange={handleInputChange}
              placeholder="4000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="panelDesignationRank">パネル指名ランク</Label>
            <Input
              id="panelDesignationRank"
              name="panelDesignationRank"
              type="number"
              min={0}
              value={formData.panelDesignationRank}
              onChange={handleInputChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="regularDesignationRank">本指名ランク</Label>
            <Input
              id="regularDesignationRank"
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
          <Label htmlFor="image">メイン画像URL</Label>
          <Input
            id="image"
            name="image"
            value={formData.image}
            onChange={handleInputChange}
            placeholder="https://example.com/main.jpg"
          />
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
            <Label htmlFor="phone">TEL</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="090-1234-5678"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">メール</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="staff@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="twitterId">Twitter / X</Label>
            <Input
              id="twitterId"
              name="twitterId"
              value={formData.twitterId}
              onChange={handleInputChange}
              placeholder="@example"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="blogId">ブログウィジェット</Label>
            <Input
              id="blogId"
              name="blogId"
              value={formData.blogId}
              onChange={handleInputChange}
              placeholder="ブログ埋め込みコードなど"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="管理用パスワード"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthDate">生年月日</Label>
            <Input
              id="birthDate"
              name="birthDate"
              type="date"
              value={formData.birthDate}
              onChange={handleInputChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="registrationDate">登録日</Label>
            <Input
              id="registrationDate"
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {options.map((option) => {
            const selected = formData.availableOptions.includes(option.id)
            const caption =
              option.price === 0 ? '追加料金なし' : `追加料金 ${option.price.toLocaleString()}円`
            return (
              <OptionPill
                key={option.id}
                label={option.name}
                caption={caption}
                selected={selected}
                onToggle={() => handleOptionChange(option.id, !selected)}
              />
            )
          })}
        </div>
      </FormSection>

      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={handleCancel} className="sm:min-w-[120px]">
          キャンセル
        </Button>
        <Button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-700 sm:min-w-[160px]"
        >
          保存
        </Button>
      </div>
    </form>
  )
}

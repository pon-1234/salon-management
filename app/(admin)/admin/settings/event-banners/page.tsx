'use client'

import { useEffect, useMemo, useState, useId, useRef, type ChangeEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { Header } from '@/components/header'
import { toast } from '@/hooks/use-toast'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ImageIcon,
  Laptop,
  MonitorSmartphone,
  PlusCircle,
  Save,
  Trash2,
  Loader2,
  Link2,
  Upload,
} from 'lucide-react'

type BannerImageField = 'imageUrl' | 'mobileImageUrl'
type BannerScheduleField = 'startDate' | 'endDate'

interface BannerFormState {
  id?: string
  title: string
  description: string
  imageUrl: string
  mobileImageUrl: string
  link: string
  isActive: boolean
  displayOrder: number
  startDate: string
  endDate: string
}

const MAX_BANNERS = 10

function createEmptyBanner(order: number): BannerFormState {
  return {
    title: '',
    description: '',
    imageUrl: '',
    mobileImageUrl: '',
    link: '',
    isActive: true,
    displayOrder: order,
    startDate: '',
    endDate: '',
  }
}

function mapBanner(payload: any, index: number): BannerFormState {
  return {
    id: payload?.id,
    title: payload?.title ?? '',
    description: payload?.description ?? '',
    imageUrl: payload?.imageUrl ?? '',
    mobileImageUrl: payload?.mobileImageUrl ?? '',
    link: payload?.link ?? '',
    isActive: payload?.isActive ?? true,
    displayOrder: payload?.displayOrder ?? index,
    startDate: normalizeDateValue(payload?.startDate),
    endDate: normalizeDateValue(payload?.endDate),
  }
}

export default function EventBannersPage() {
  const [banners, setBanners] = useState<BannerFormState[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingIndex, setSavingIndex] = useState<number | null>(null)
  const [uploadingField, setUploadingField] = useState<string | null>(null)

  const canAddMore = useMemo(() => banners.length < MAX_BANNERS, [banners.length])

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const response = await fetch('/api/settings/event-banners')
        if (!response.ok) {
          throw new Error('バナー情報の取得に失敗しました')
        }
        const payload = await response.json()
        const data = Array.isArray(payload?.data) ? payload.data : payload
        setBanners(Array.isArray(data) ? data.map(mapBanner) : [])
      } catch (error) {
        console.error(error)
        toast({
          title: 'エラー',
          description: 'バナー情報の取得に失敗しました',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchBanners()
  }, [])

  const updateBanner = (index: number, changes: Partial<BannerFormState>) => {
    setBanners((prev) =>
      prev.map((banner, i) => (i === index ? { ...banner, ...changes, displayOrder: i } : banner))
    )
  }

  const handleAddBanner = () => {
    if (!canAddMore) {
      toast({
        title: '上限に達しています',
        description: `バナーは最大${MAX_BANNERS}件まで管理できます`,
        variant: 'destructive',
      })
      return
    }
    setBanners((prev) => [...prev, createEmptyBanner(prev.length)])
  }

  const handleRemoveBanner = (index: number) => {
    setBanners((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((banner, i) => ({ ...banner, displayOrder: i }))
    )
  }

  const handleReorder = (index: number, direction: 'up' | 'down') => {
    setBanners((prev) => {
      const next = [...prev]
      const newIndex = direction === 'up' ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= next.length) return prev
      const temp = next[index]
      next[index] = next[newIndex]
      next[newIndex] = temp
      return next.map((banner, i) => ({ ...banner, displayOrder: i }))
    })
  }

  const uploadImage = async (file: File) => {
    const maxSize = 5 * 1024 * 1024
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

    if (file.size > maxSize) {
      throw new Error('ファイルサイズが大きすぎます（最大5MB）')
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error('対応していないファイル形式です（JPEG, PNG, WebPのみ）')
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', 'event-banners')

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    const result = await response.json()

    if (!response.ok || !result?.success || !result?.url) {
      throw new Error(result?.error ?? '画像のアップロードに失敗しました')
    }

    return result.url as string
  }

  const handleImageUpload = async (
    index: number,
    field: BannerImageField,
    file: File | null
  ) => {
    if (!file) return
    const fieldKey = `${index}-${field}`
    setUploadingField(fieldKey)
    try {
      const url = await uploadImage(file)
      updateBanner(index, { [field]: url } as Partial<BannerFormState>)
      toast({ title: 'アップロード成功', description: '画像を保存しました' })
    } catch (error) {
      const message = error instanceof Error ? error.message : '画像のアップロードに失敗しました'
      toast({ title: 'エラー', description: message, variant: 'destructive' })
    } finally {
      setUploadingField((current) => (current === fieldKey ? null : current))
    }
  }

  const handleDateChange = (index: number, field: BannerScheduleField, value: string) => {
    const isoValue = fromDatetimeLocalInput(value)
    updateBanner(index, { [field]: isoValue } as Partial<BannerFormState>)
  }

  const handleSave = async (triggerIndex: number | null = null) => {
    if (banners.length === 0) {
      toast({
        title: 'バナーがありません',
        description: '少なくとも1件のバナーを登録してください',
        variant: 'destructive',
      })
      return
    }

    const hasInvalid = banners.some((banner) => !banner.title.trim() || !banner.imageUrl.trim())
    if (hasInvalid) {
      toast({
        title: '入力エラー',
        description: 'タイトルとPC用の画像は必須です',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    setSavingIndex(triggerIndex)
    try {
      const payload = {
        banners: banners.map((banner, index) => ({
          id: banner.id,
          title: banner.title.trim(),
          description: (banner.description ?? '').trim(),
          imageUrl: banner.imageUrl.trim(),
          mobileImageUrl: (banner.mobileImageUrl ?? '').trim(),
          link: (banner.link ?? '').trim(),
          displayOrder: index,
          isActive: banner.isActive,
          startDate: banner.startDate ? banner.startDate : null,
          endDate: banner.endDate ? banner.endDate : null,
        })),
      }

      const response = await fetch('/api/settings/event-banners', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null)
        throw new Error(errorPayload?.message ?? '保存に失敗しました')
      }

      const responseBody = await response.json().catch(() => null)
      const updated = Array.isArray(responseBody?.data)
        ? responseBody.data.map(mapBanner)
        : banners
      setBanners(updated)

      toast({ title: '保存しました', description: 'バナー設定を更新しました' })
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存に失敗しました'
      toast({ title: 'エラー', description: message, variant: 'destructive' })
    } finally {
      setSaving(false)
      setSavingIndex(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="p-8">
          <div className="mx-auto max-w-5xl">
            <div className="flex h-64 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600" />
                <p className="text-gray-600">読み込み中...</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/admin/settings">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <p className="text-sm text-gray-500">PC版トップページに表示されるイベントバナー</p>
              <h1 className="text-3xl font-bold text-gray-900">トップバナー管理</h1>
            </div>
            <div className="flex-1" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>バナー運用のヒント</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-2 pl-5 text-sm text-gray-600">
                <li>PC用（横長）とSP用（縦長）の2種類の画像を登録できます。未登録の場合はPC画像が使用されます。</li>
                <li>リンクは外部URLまたは「/ikebukuro/cast」などの内部パスを設定できます。</li>
                <li>上にあるバナーほど優先して表示されます。矢印ボタンで並び替えてください。</li>
              </ul>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {banners.map((banner, index) => (
              <Card key={banner.id ?? `new-${index}`}>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <ImageIcon className="h-5 w-5 text-emerald-600" />
                      バナー {index + 1}
                      {!banner.isActive && (
                        <span className="text-xs font-medium text-orange-500">非表示</span>
                      )}
                    </CardTitle>
                    <p className="text-sm text-gray-500">PC + SP に表示されるキャンペーン画像</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleReorder(index, 'up')}
                        disabled={index === 0}
                        aria-label="上に移動"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleReorder(index, 'down')}
                        disabled={index === banners.length - 1}
                        aria-label="下に移動"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-red-500"
                      onClick={() => handleRemoveBanner(index)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      削除
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>タイトル</Label>
                      <Input
                        value={banner.title}
                        onChange={(e) => updateBanner(index, { title: e.target.value })}
                        placeholder="例：新人割引キャンペーン"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>リンク</Label>
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-gray-400" />
                        <Input
                          value={banner.link}
                          onChange={(e) => updateBanner(index, { link: e.target.value })}
                          placeholder="https:// または /ikebukuro/cast"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>説明（任意）</Label>
                    <Textarea
                      value={banner.description}
                      onChange={(e) => updateBanner(index, { description: e.target.value })}
                      placeholder="バナーの補足やメモを残せます"
                      rows={3}
                    />
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <ImageField
                      label="PCバナー (横長)"
                      icon={<Laptop className="h-4 w-4" />}
                      value={banner.imageUrl}
                      uploading={uploadingField === `${index}-imageUrl`}
                      onUpload={(file) => handleImageUpload(index, 'imageUrl', file)}
                      onChange={(value) => updateBanner(index, { imageUrl: value })}
                    />
                    <ImageField
                      label="SPバナー (縦長)"
                      icon={<MonitorSmartphone className="h-4 w-4" />}
                      value={banner.mobileImageUrl}
                      uploading={uploadingField === `${index}-mobileImageUrl`}
                      onUpload={(file) => handleImageUpload(index, 'mobileImageUrl', file)}
                      onChange={(value) => updateBanner(index, { mobileImageUrl: value })}
                      helper="未設定の場合はPCバナーがそのまま利用されます"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>掲載開始（任意）</Label>
                      <Input
                        type="datetime-local"
                        value={toDatetimeLocalInput(banner.startDate)}
                        onChange={(e) => handleDateChange(index, 'startDate', e.target.value)}
                        placeholder="2025-01-01T10:00"
                      />
                      <p className="text-xs text-gray-500">
                        指定した日時以降に表示されます（未設定で常時掲載）
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>掲載終了（任意）</Label>
                      <Input
                        type="datetime-local"
                        value={toDatetimeLocalInput(banner.endDate)}
                        min={toDatetimeLocalInput(banner.startDate) || undefined}
                        onChange={(e) => handleDateChange(index, 'endDate', e.target.value)}
                        placeholder="2025-01-10T23:59"
                      />
                      <p className="text-xs text-gray-500">
                        指定した日時まで表示されます（空欄で終了なし）
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-md bg-gray-50 p-3">
                    <div>
                      <Label className="text-sm font-medium">表示・非表示</Label>
                      <p className="text-xs text-gray-500">チェックを外すとバナーは公開されません</p>
                    </div>
                    <Switch
                      checked={banner.isActive}
                      onCheckedChange={(checked) => updateBanner(index, { isActive: checked })}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t">
                  <p className="text-sm text-gray-500">このバナーの編集内容を保存します</p>
                  <Button
                    type="button"
                    onClick={() => handleSave(index)}
                    disabled={saving && savingIndex !== index}
                  >
                    {saving && savingIndex === index ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        保存する
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}

            {banners.length === 0 && (
              <div className="rounded-lg border border-dashed p-12 text-center text-gray-500">
                バナーが登録されていません。まずは「バナーを追加」を押してください。
              </div>
            )}

            <div className="space-y-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleAddBanner}
                disabled={!canAddMore}
                className="w-full"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                バナーを追加
              </Button>
              <div className="flex justify-end">
                <Button type="button" onClick={() => handleSave(null)} disabled={saving}>
                  {saving && savingIndex === null ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      すべて保存する
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function normalizeDateValue(value: unknown): string {
  if (value === undefined || value === null || value === '') {
    return ''
  }
  const date = value instanceof Date ? value : new Date(value as string)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toISOString()
}

function toDatetimeLocalInput(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - offset * 60 * 1000)
  return localDate.toISOString().slice(0, 16)
}

function fromDatetimeLocalInput(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toISOString()
}

interface ImageFieldProps {
  label: string
  icon: ReactNode
  helper?: string
  value: string
  uploading: boolean
  onUpload: (file: File | null) => void
  onChange: (value: string) => void
}

function ImageField({ label, icon, helper, value, uploading, onUpload, onChange }: ImageFieldProps) {
  const inputId = useId()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    onUpload(file)
    if (event.target) {
      event.target.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <Label htmlFor={inputId} className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {label}
      </Label>
      <div className="flex flex-col gap-3 rounded-lg border bg-white p-4">
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed bg-gray-50 p-3">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt={label}
              className="max-h-32 w-full rounded-md object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-xs text-gray-400">
              <ImageIcon className="h-6 w-6" />
              画像が登録されていません
            </div>
          )}
        </div>
        <Input
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https:// または /images/..."
        />
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleSelect}
          />
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                アップロード中...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                画像をアップロード
              </>
            )}
          </Button>
          {value && (
            <Button type="button" variant="ghost" onClick={() => onChange('')}>
              クリア
            </Button>
          )}
        </div>
        {helper && <p className="text-xs text-gray-500">{helper}</p>}
      </div>
    </div>
  )
}

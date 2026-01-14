'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Cast } from '@/lib/cast/types'
import { Store } from '@/lib/store/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Heart,
  Star,
  Calendar,
  Clock,
  MapPin,
  Award,
  Cigarette,
  Languages,
  Home,
  Droplets,
  User,
  ChevronLeft,
  ChevronRight,
  X,
  Phone,
  MessageSquare,
  Send,
} from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { getOptionById } from '@/lib/options/data'
import type { Option } from '@/lib/types/course-option'

interface CastDetailContentProps {
  cast: Cast
  store: Store
}

export function CastDetailContent({ cast, store }: CastDetailContentProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isRequestOpen, setIsRequestOpen] = useState(false)

  // Get available options details
  const availableOptions: Option[] = cast.availableOptions
    .map((optionId) => getOptionById(optionId))
    .filter((option): option is Option => Boolean(option))

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev === cast.images.length - 1 ? 0 : prev + 1))
  }

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev === 0 ? cast.images.length - 1 : prev - 1))
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center space-x-2 text-sm">
          <li>
            <Link href={`/${store.slug}`} className="text-gray-500 hover:text-gray-700">
              ホーム
            </Link>
          </li>
          <li className="text-gray-500">/</li>
          <li>
            <Link href={`/${store.slug}/cast`} className="text-gray-500 hover:text-gray-700">
              キャスト一覧
            </Link>
          </li>
          <li className="text-gray-500">/</li>
          <li className="text-gray-900">{cast.name}</li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column - Images and Basic Info */}
        <div className="space-y-6 lg:col-span-1">
          {/* Main Image */}
          <Card className="overflow-hidden">
            <div className="relative aspect-[3/4]">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-300 to-purple-400" />
              {cast.images.length > 0 && (
                <>
                  <Image
                    src={cast.images[selectedImageIndex]}
                    alt={cast.name}
                    fill
                    className="cursor-pointer object-cover"
                    onClick={() => setIsImageModalOpen(true)}
                  />
                  {cast.images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </>
              )}

              {/* Badges */}
              <div className="absolute left-2 top-2 space-y-2">
                {cast.workStatus === '出勤' && <Badge className="bg-green-500">出勤中</Badge>}
                {cast.panelDesignationRank <= 3 && cast.panelDesignationRank > 0 && (
                  <Badge className="bg-yellow-500">
                    <Award className="mr-1 h-3 w-3" />
                    ランキング{cast.panelDesignationRank}位
                  </Badge>
                )}
              </div>

              {/* Favorite Button */}
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className="absolute right-2 top-2 rounded-full bg-white/90 p-2 backdrop-blur hover:bg-white"
              >
                <Heart
                  className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
                />
              </button>
            </div>

            {/* Thumbnail Images */}
            {cast.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2 p-4">
                {cast.images.slice(0, 4).map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative aspect-square overflow-hidden rounded ${
                      selectedImageIndex === index ? 'ring-2 ring-purple-500' : ''
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${cast.name} ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{cast.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">年齢</span>
                <span className="font-medium">{cast.age}歳</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">身長</span>
                <span className="font-medium">{cast.height}cm</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">スリーサイズ</span>
                <span className="font-medium">
                  B
                  {cast.bust === 'G' || cast.bust === 'F' || cast.bust === 'E' || cast.bust === 'D'
                    ? `${cast.publicProfile?.bustCup || cast.bust}`
                    : cast.bust}{' '}
                  W{cast.waist} H{cast.hip}
                </span>
              </div>
              {cast.publicProfile && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">血液型</span>
                    <span className="font-medium">{cast.publicProfile.bloodType}型</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">出身地</span>
                    <span className="font-medium">{cast.publicProfile.birthplace}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                出勤予定
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cast.workStatus === '出勤' ? (
                <div className="space-y-2">
                  <Badge className="w-full justify-center bg-green-500 py-2">本日出勤中</Badge>
                  {cast.workStart && cast.workEnd && (
                    <p className="text-center text-sm text-gray-600">
                      {format(cast.workStart, 'HH:mm')} ～ {format(cast.workEnd, 'HH:mm')}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-center text-gray-500">本日は出勤予定なし</p>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button className="w-full" size="lg">
              <Phone className="mr-2 h-5 w-5" />
              今すぐ予約
            </Button>
            <Button variant="outline" className="w-full">
              <MessageSquare className="mr-2 h-5 w-5" />
              口コミを見る
            </Button>
            {cast.requestAttendanceEnabled && (
              <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="w-full">
                    <Send className="mr-2 h-5 w-5" />
                    リクエスト出勤
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>リクエスト出勤のお問い合わせ</DialogTitle>
                  </DialogHeader>
                  <RequestAttendanceForm cast={cast} store={store} onSubmitted={() => setIsRequestOpen(false)} />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Right Column - Detailed Info */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile">プロフィール</TabsTrigger>
              <TabsTrigger value="options">オプション</TabsTrigger>
              <TabsTrigger value="reviews">口コミ</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-6 space-y-6">
              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle>自己紹介</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{cast.description}</p>
                </CardContent>
              </Card>

              {/* Public Profile */}
              {cast.publicProfile && (
                <>
                  {/* Personality & Services */}
                  <Card>
                    <CardHeader>
                      <CardTitle>キャラクター</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="mb-2 font-medium">タイプ</h4>
                        <div className="flex flex-wrap gap-2">
                          {cast.publicProfile.bodyType.map((type) => (
                            <Badge key={type} variant="secondary">
                              {type}
                            </Badge>
                          ))}
                          {cast.publicProfile.personality.map((p) => (
                            <Badge key={p} variant="outline">
                              {p}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="mb-2 font-medium">得意なプレイ</h4>
                        <div className="flex flex-wrap gap-2">
                          {cast.publicProfile.availableServices.map((service) => (
                            <Badge key={service} className="bg-purple-100 text-purple-800">
                              {service}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Personal Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle>詳細プロフィール</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">ひとことで言うと</span>
                          </div>
                          <p className="pl-6 font-medium">
                            {cast.publicProfile.personalityOneWord}
                          </p>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Heart className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">チャームポイント</span>
                          </div>
                          <p className="pl-6 font-medium">{cast.publicProfile.charmPoint}</p>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">趣味</span>
                          </div>
                          <p className="pl-6 font-medium">{cast.publicProfile.hobbies}</p>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">好きなタイプ</span>
                          </div>
                          <p className="pl-6 font-medium">{cast.publicProfile.favoriteType}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Messages */}
                  <Card>
                    <CardHeader>
                      <CardTitle>メッセージ</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {cast.publicProfile.shopMessage && (
                        <div>
                          <h4 className="mb-2 font-medium text-purple-600">お店から</h4>
                          <p className="whitespace-pre-wrap">{cast.publicProfile.shopMessage}</p>
                        </div>
                      )}
                      {cast.publicProfile.customerMessage && (
                        <div>
                          <h4 className="mb-2 font-medium text-pink-600">{cast.name}から</h4>
                          <p className="whitespace-pre-wrap">
                            {cast.publicProfile.customerMessage}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Additional Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle>その他情報</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <Cigarette className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{cast.publicProfile.smoking}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Home className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">
                            ホテル派遣: {cast.publicProfile.homeVisit}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Languages className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">外国人: {cast.publicProfile.foreignerOk}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Droplets className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">タトゥー: {cast.publicProfile.tattoo}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="options" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>利用可能オプション</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {availableOptions.map((option) => (
                      <div key={option!.id} className="rounded-lg border p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{option!.name}</h4>
                            {option!.description && (
                              <p className="mt-1 text-sm text-gray-600">{option!.description}</p>
                            )}
                          </div>
                          <span
                            className={`font-bold ${
                              option!.price === 0 ? 'text-green-600' : 'text-purple-600'
                            }`}
                          >
                            {option!.price === 0 ? '無料' : `¥${option!.price.toLocaleString()}`}
                          </span>
                        </div>
                        {option!.isPopular && option!.note && (
                          <Badge className="mt-2 bg-red-500">{option!.note}</Badge>
                        )}
                      </div>
                    ))}
                  </div>

                  {availableOptions.length === 0 && (
                    <p className="text-center text-gray-500">オプション情報がありません</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviews" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>口コミ・評価</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="py-12 text-center">
                    <p className="mb-4 text-gray-500">まだ口コミがありません</p>
                    <Button variant="outline" asChild>
                      <Link href={`/${store.slug}/reviews?castId=${cast.id}`}>
                        口コミを見る・投稿する
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Image Modal */}
      {isImageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <button
            onClick={() => setIsImageModalOpen(false)}
            className="absolute right-4 top-4 rounded-full p-2 text-white hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="relative max-h-[90vh] max-w-4xl">
            <Image
              src={cast.images[selectedImageIndex]}
              alt={cast.name}
              width={800}
              height={1200}
              className="object-contain"
            />

            {cast.images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white hover:bg-black/70"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white hover:bg-black/70"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function RequestAttendanceForm({
  cast,
  store,
  onSubmitted,
}: {
  cast: Cast
  store: Store
  onSubmitted: () => void
}) {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    email: '',
    emailConfirm: '',
    phone: '',
    memberStatus: '',
    preferredDate: '',
    preferredTime: '',
    meetingPlace: '',
    course: '',
    secondCandidate: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleChange = (key: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!formData.name.trim()) return setError('お名前を入力してください。')
    if (!formData.age.trim()) return setError('年齢を入力してください。')
    if (!formData.email.trim()) return setError('メールアドレスを入力してください。')
    if (formData.email.trim() !== formData.emailConfirm.trim()) {
      return setError('メールアドレスが一致しません。')
    }
    if (!formData.phone.trim()) return setError('電話番号を入力してください。')
    if (!formData.memberStatus) return setError('会員登録情報を選択してください。')
    if (!formData.preferredDate) return setError('希望日を選択してください。')
    if (!formData.preferredTime) return setError('希望時間を入力してください。')
    if (!formData.meetingPlace.trim()) return setError('待ち合わせ場所を入力してください。')
    if (!formData.course.trim()) return setError('コースを入力してください。')

    setSubmitting(true)
    try {
      const response = await fetch('/api/request-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          storeName: store.displayName ?? store.name,
          castId: cast.id,
          castName: cast.name,
          name: formData.name.trim(),
          age: formData.age.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          memberStatus: formData.memberStatus,
          preferredDate: formData.preferredDate,
          preferredTime: formData.preferredTime,
          meetingPlace: formData.meetingPlace.trim(),
          course: formData.course.trim(),
          secondCandidate: formData.secondCandidate.trim() || null,
          notes: formData.notes.trim() || null,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error ?? '送信に失敗しました。')
      }

      setSuccess('送信しました。店舗からの連絡をお待ちください。')
      setTimeout(() => {
        onSubmitted()
      }, 800)
    } catch (err) {
      setError(err instanceof Error ? err.message : '送信に失敗しました。')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {error && <p className="rounded-md bg-red-50 p-2 text-sm text-red-600">{error}</p>}
      {success && <p className="rounded-md bg-emerald-50 p-2 text-sm text-emerald-700">{success}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>お名前（必須）</Label>
          <Input
            value={formData.name}
            onChange={(event) => handleChange('name', event.target.value)}
            placeholder="ニックネームでもOK"
            disabled={submitting}
          />
        </div>
        <div className="space-y-2">
          <Label>年齢（必須）</Label>
          <Input
            value={formData.age}
            onChange={(event) => handleChange('age', event.target.value)}
            placeholder="例: 28"
            disabled={submitting}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>メールアドレス（必須）</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(event) => handleChange('email', event.target.value)}
            placeholder="example@email.com"
            disabled={submitting}
          />
        </div>
        <div className="space-y-2">
          <Label>メールアドレス（確認）</Label>
          <Input
            type="email"
            value={formData.emailConfirm}
            onChange={(event) => handleChange('emailConfirm', event.target.value)}
            placeholder="もう一度入力"
            disabled={submitting}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>電話番号（必須）</Label>
          <Input
            value={formData.phone}
            onChange={(event) => handleChange('phone', event.target.value)}
            placeholder="000-0000-0000"
            disabled={submitting}
          />
        </div>
        <div className="space-y-2">
          <Label>会員登録情報（必須）</Label>
          <Select
            value={formData.memberStatus}
            onValueChange={(value) => handleChange('memberStatus', value)}
            disabled={submitting}
          >
            <SelectTrigger>
              <SelectValue placeholder="選択してください" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="registered">会員登録済み</SelectItem>
              <SelectItem value="new">新規</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>第1候補女性</Label>
          <Input value={cast.name} disabled />
        </div>
        <div className="space-y-2">
          <Label>第2候補女性</Label>
          <Input
            value={formData.secondCandidate}
            onChange={(event) => handleChange('secondCandidate', event.target.value)}
            placeholder="任意"
            disabled={submitting}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>希望日（必須）</Label>
          <Input
            type="date"
            value={formData.preferredDate}
            onChange={(event) => handleChange('preferredDate', event.target.value)}
            disabled={submitting}
          />
        </div>
        <div className="space-y-2">
          <Label>希望時間（必須）</Label>
          <Input
            type="time"
            value={formData.preferredTime}
            onChange={(event) => handleChange('preferredTime', event.target.value)}
            disabled={submitting}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>待ち合わせ場所（必須）</Label>
        <Input
          value={formData.meetingPlace}
          onChange={(event) => handleChange('meetingPlace', event.target.value)}
          placeholder="例: 池袋駅西口"
          disabled={submitting}
        />
      </div>

      <div className="space-y-2">
        <Label>コース（必須）</Label>
        <Input
          value={formData.course}
          onChange={(event) => handleChange('course', event.target.value)}
          placeholder="100分（26,000円）"
          disabled={submitting}
        />
      </div>

      <div className="space-y-2">
        <Label>その他ご要望</Label>
        <Textarea
          value={formData.notes}
          onChange={(event) => handleChange('notes', event.target.value)}
          placeholder="例）180分コース以上のコースは案内可能ですか？"
          disabled={submitting}
        />
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
        <p>・当日リクエストの場合はお店からお電話させて頂く場合もございます。</p>
        <p>・ご新規様からのフォーム予約は電話確認後にリクエスト成立となります。</p>
        <p>・リクエスト予約は100分コースからのご案内となります。</p>
        <p>・リクエスト成立後のチェンジ・キャンセルはできません。</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
        <p>※確認メールをお送りします。ドメイン指定は「customer.goldball@gmail.com」を許可してください。</p>
        <p>※女性の事情によりご希望に添えない場合があります。</p>
        <p>※3営業日以内に予定が立てられない場合は不成立となります。</p>
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? '送信中...' : '送信する'}
      </Button>
    </form>
  )
}

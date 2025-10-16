'use client'

import React, { useState } from 'react'
import { Cast, PublicProfile } from '@/lib/cast/types'
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
import { Save, X } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { FormSection } from '@/components/cast/form-section'
import { cn } from '@/lib/utils'

interface PublicProfileFormProps {
  cast: Cast
  onSubmit: (data: { publicProfile: PublicProfile; basicInfo: Partial<Cast> }) => void
  onCancel?: () => void
  isEditing?: boolean
  setIsEditing?: (editing: boolean) => void
}

const PROFILE_STYLE_OPTIONS = ['カワイイ系', 'キレイ系', 'セクシー系', 'お姉さん系', 'モデル系', 'おっとり系']
const BODY_TYPE_OPTIONS = ['スレンダー', '普通', 'グラマー', 'ぽっちゃり', '小柄', '長身']
const PERSONALITY_OPTIONS = [
  '正統派セラピスト',
  '清楚なお姉さん',
  'モデルなみのスタイル',
  'エッチなお姉さん',
  '魅惑の人妻',
  'エロすぎる痴女',
]
const SERVICE_OPTIONS = [
  '睾丸マッサージ',
  'パウダーマッサージ',
  'オイルマッサージ',
  '指圧マッサージ',
  '全身マッサージ',
  '密着フェザータッチ',
  '鼠径部回春',
  '上半身リップ',
  '洗体サーサービス',
  '全身密着泡洗体',
  'トップレス',
  'Tバック',
  '手コキ',
]
const SMOKING_OPTIONS: PublicProfile['smoking'][] = ['吸わない', '吸う', '電子タバコ']
const BLOOD_TYPE_OPTIONS: PublicProfile['bloodType'][] = ['A', 'B', 'O', 'AB', '秘密']
const HOME_VISIT_OPTIONS: PublicProfile['homeVisit'][] = ['NG', 'OK']
const TATTOO_OPTIONS: PublicProfile['tattoo'][] = ['なし', 'ある']
const FOREIGNER_OPTIONS: PublicProfile['foreignerOk'][] = ['NG', 'OK']

const SelectablePill = ({
  label,
  selected,
  onToggle,
  disabled,
  className,
}: {
  label: string
  selected: boolean
  onToggle: () => void
  disabled?: boolean
  className?: string
}) => (
  <button
    type="button"
    onClick={onToggle}
    disabled={disabled}
    className={cn(
      'rounded-full border px-4 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
      selected
        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
        : 'border-border hover:border-emerald-400 hover:bg-emerald-50',
      className
    )}
  >
    {label}
  </button>
)

export function PublicProfileForm({
  cast,
  onSubmit,
  onCancel,
  isEditing = false,
  setIsEditing,
}: PublicProfileFormProps) {
  const [publicProfile, setPublicProfile] = useState<PublicProfile>({
    bustCup: cast?.publicProfile?.bustCup || '',
    bodyType: cast?.publicProfile?.bodyType || [],
    personality: cast?.publicProfile?.personality || [],
    availableServices: cast?.publicProfile?.availableServices || [],
    smoking: cast?.publicProfile?.smoking || '吸わない',
    massageQualification: cast?.publicProfile?.massageQualification || false,
    qualificationDetails: cast?.publicProfile?.qualificationDetails || [],
    homeVisit: cast?.publicProfile?.homeVisit || 'NG',
    tattoo: cast?.publicProfile?.tattoo || 'なし',
    bloodType: cast?.publicProfile?.bloodType || '秘密',
    birthplace: cast?.publicProfile?.birthplace || '',
    foreignerOk: cast?.publicProfile?.foreignerOk || 'NG',
    hobbies: cast?.publicProfile?.hobbies || '',
    charmPoint: cast?.publicProfile?.charmPoint || '',
    personalityOneWord: cast?.publicProfile?.personalityOneWord || '',
    favoriteType: cast?.publicProfile?.favoriteType || '',
    favoriteFood: cast?.publicProfile?.favoriteFood || '',
    specialTechnique: cast?.publicProfile?.specialTechnique || '',
    shopMessage: cast?.publicProfile?.shopMessage || '',
    customerMessage: cast?.publicProfile?.customerMessage || '',
  })

  const [basicInfo, setBasicInfo] = useState({
    height: cast?.height || 0,
    bust: cast?.bust || '',
    waist: cast?.waist || 0,
    hip: cast?.hip || 0,
    type: cast?.type || '',
    description: cast?.description || '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ publicProfile, basicInfo })
    if (setIsEditing) setIsEditing(false)
  }

  const handleCancel = () => {
    // Reset to original values
    setPublicProfile({
      bustCup: cast?.publicProfile?.bustCup || '',
      bodyType: cast?.publicProfile?.bodyType || [],
      personality: cast?.publicProfile?.personality || [],
      availableServices: cast?.publicProfile?.availableServices || [],
      smoking: cast?.publicProfile?.smoking || '吸わない',
      massageQualification: cast?.publicProfile?.massageQualification || false,
      qualificationDetails: cast?.publicProfile?.qualificationDetails || [],
      homeVisit: cast?.publicProfile?.homeVisit || 'NG',
      tattoo: cast?.publicProfile?.tattoo || 'なし',
      bloodType: cast?.publicProfile?.bloodType || '秘密',
      birthplace: cast?.publicProfile?.birthplace || '',
      foreignerOk: cast?.publicProfile?.foreignerOk || 'NG',
      hobbies: cast?.publicProfile?.hobbies || '',
      charmPoint: cast?.publicProfile?.charmPoint || '',
      personalityOneWord: cast?.publicProfile?.personalityOneWord || '',
      favoriteType: cast?.publicProfile?.favoriteType || '',
      favoriteFood: cast?.publicProfile?.favoriteFood || '',
      specialTechnique: cast?.publicProfile?.specialTechnique || '',
      shopMessage: cast?.publicProfile?.shopMessage || '',
      customerMessage: cast?.publicProfile?.customerMessage || '',
    })
    setBasicInfo({
      height: cast?.height || 0,
      bust: cast?.bust || '',
      waist: cast?.waist || 0,
      hip: cast?.hip || 0,
      type: cast?.type || '',
      description: cast?.description || '',
    })
    setIsEditing?.(false)
    onCancel?.()
  }

  const handleChange = (field: keyof PublicProfile, value: any) => {
    setPublicProfile((prev) => ({ ...prev, [field]: value }))
  }

  const handleBasicInfoChange = (field: string, value: any) => {
    setBasicInfo((prev) => ({ ...prev, [field]: value }))
  }

  const handleArrayToggle = (field: keyof PublicProfile, value: string) => {
    setPublicProfile((prev) => {
      const currentArray = prev[field] as string[]
      const newArray = currentArray.includes(value)
        ? currentArray.filter((item) => item !== value)
        : [...currentArray, value]
      return { ...prev, [field]: newArray }
    })
  }

  return (
    <div className="space-y-6">
      {!isEditing && (
        <div className="flex justify-end">
          <Button
            onClick={() => setIsEditing?.(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            編集
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection
          title="基本スタイル情報"
          description="プロフィールページで強調表示される基礎情報です。数字は半角で入力してください。"
        >
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="height">身長 (cm)</Label>
              <Input
                id="height"
                type="number"
                value={basicInfo.height || ''}
                onChange={(e) => handleBasicInfoChange('height', Number(e.target.value) || 0)}
                placeholder="168"
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bust">バスト</Label>
              <Input
                id="bust"
                value={basicInfo.bust || ''}
                onChange={(e) => handleBasicInfoChange('bust', e.target.value)}
                placeholder="84"
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bustCup">カップ</Label>
              <Input
                id="bustCup"
                value={publicProfile.bustCup}
                onChange={(e) => handleChange('bustCup', e.target.value)}
                placeholder="G"
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="waist">ウエスト (cm)</Label>
              <Input
                id="waist"
                type="number"
                value={basicInfo.waist || ''}
                onChange={(e) => handleBasicInfoChange('waist', Number(e.target.value) || 0)}
                placeholder="62"
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hip">ヒップ (cm)</Label>
              <Input
                id="hip"
                type="number"
                value={basicInfo.hip || ''}
                onChange={(e) => handleBasicInfoChange('hip', Number(e.target.value) || 0)}
                placeholder="88"
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">タイプ</Label>
              <Select
                value={basicInfo.type || ''}
                onValueChange={(value) => handleBasicInfoChange('type', value)}
                disabled={!isEditing}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="タイプを選択" />
                </SelectTrigger>
                <SelectContent>
                  {PROFILE_STYLE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-1 xl:col-span-3">
              <Label htmlFor="birthplace">出身地</Label>
              <Input
                id="birthplace"
                value={publicProfile.birthplace}
                onChange={(e) => handleChange('birthplace', e.target.value)}
                placeholder="関東地方"
                disabled={!isEditing}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">プロフィール文</Label>
            <Textarea
              id="description"
              value={basicInfo.description || ''}
              onChange={(e) => handleBasicInfoChange('description', e.target.value)}
              placeholder="心を込めたサービスでお迎えします。"
              className="min-h-[120px]"
              disabled={!isEditing}
            />
          </div>
        </FormSection>

        <FormSection
          title="詳細スタイル情報"
          description="タグを選択すると、お客様が検索しやすくなります。複数選択可能です。"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">体型</Label>
              <div className="flex flex-wrap gap-2">
                {BODY_TYPE_OPTIONS.map((type) => (
                  <SelectablePill
                    key={type}
                    label={type}
                    selected={publicProfile.bodyType.includes(type)}
                    onToggle={() => handleArrayToggle('bodyType', type)}
                    disabled={!isEditing}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">個性</Label>
              <div className="flex flex-wrap gap-2">
                {PERSONALITY_OPTIONS.map((personality) => (
                  <SelectablePill
                    key={personality}
                    label={personality}
                    selected={publicProfile.personality.includes(personality)}
                    onToggle={() => handleArrayToggle('personality', personality)}
                    disabled={!isEditing}
                  />
                ))}
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection
          title="可能プレイ"
          description="提供可能なサービスを選択すると、予約画面のおすすめにも反映されます。"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {SERVICE_OPTIONS.map((service) => (
              <SelectablePill
                key={service}
                label={service}
                selected={publicProfile.availableServices.includes(service)}
                onToggle={() => handleArrayToggle('availableServices', service)}
                disabled={!isEditing}
                className="w-full justify-between"
              />
            ))}
          </div>
        </FormSection>

        <FormSection
          title="検索用情報"
          description="検索フィルターに使用される項目です。未選択の場合は「秘密」として扱われます。"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>タバコ</Label>
              <Select
                value={publicProfile.smoking}
                onValueChange={(value: PublicProfile['smoking']) => handleChange('smoking', value)}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {SMOKING_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>血液型</Label>
              <Select
                value={publicProfile.bloodType}
                onValueChange={(value: PublicProfile['bloodType']) => handleChange('bloodType', value)}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {BLOOD_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>自宅派遣</Label>
              <Select
                value={publicProfile.homeVisit}
                onValueChange={(value: PublicProfile['homeVisit']) => handleChange('homeVisit', value)}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {HOME_VISIT_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>タトゥー</Label>
              <Select
                value={publicProfile.tattoo}
                onValueChange={(value: PublicProfile['tattoo']) => handleChange('tattoo', value)}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {TATTOO_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>外国人対応</Label>
              <Select
                value={publicProfile.foreignerOk}
                onValueChange={(value: PublicProfile['foreignerOk']) =>
                  handleChange('foreignerOk', value)
                }
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {FOREIGNER_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
            <div>
              <Label htmlFor="massageQualification" className="text-sm font-medium">
                エステ・マッサージ資格
              </Label>
              <p className="text-xs text-muted-foreground">
                保有資格がある場合はオンにして詳細を記入してください。
              </p>
            </div>
            <Switch
              id="massageQualification"
              checked={publicProfile.massageQualification}
              onCheckedChange={(checked) => handleChange('massageQualification', checked)}
              disabled={!isEditing}
            />
          </div>
          {publicProfile.massageQualification && (
            <div className="space-y-2">
              <Label htmlFor="qualificationDetails">資格詳細</Label>
              <Textarea
                id="qualificationDetails"
                value={publicProfile.qualificationDetails.join('\n')}
                onChange={(e) =>
                  handleChange(
                    'qualificationDetails',
                    e.target.value
                      .split('\n')
                      .map((item) => item.trim())
                      .filter(Boolean)
                  )
                }
                placeholder="メンズエステ経験者&#10;アロマリンパドレナージュ&#10;前立腺マッサージ対応"
                className="min-h-[100px]"
                disabled={!isEditing}
              />
            </div>
          )}
        </FormSection>

        <FormSection
          title="個人情報・メッセージ"
          description="キャストの人柄が伝わるように具体的なエピソードを添えると効果的です。"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hobbies">趣味・特技</Label>
              <Input
                id="hobbies"
                value={publicProfile.hobbies}
                onChange={(e) => handleChange('hobbies', e.target.value)}
                placeholder="料理"
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="charmPoint">チャームポイント</Label>
              <Input
                id="charmPoint"
                value={publicProfile.charmPoint}
                onChange={(e) => handleChange('charmPoint', e.target.value)}
                placeholder="目♡"
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="personalityOneWord">性格を一言で</Label>
              <Input
                id="personalityOneWord"
                value={publicProfile.personalityOneWord}
                onChange={(e) => handleChange('personalityOneWord', e.target.value)}
                placeholder="明るい"
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="favoriteType">好きな男性タイプ</Label>
              <Input
                id="favoriteType"
                value={publicProfile.favoriteType}
                onChange={(e) => handleChange('favoriteType', e.target.value)}
                placeholder="紳士な人♡"
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="favoriteFood">好きな食べ物</Label>
              <Input
                id="favoriteFood"
                value={publicProfile.favoriteFood}
                onChange={(e) => handleChange('favoriteFood', e.target.value)}
                placeholder="プリン"
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialTechnique">私の奥義（金の技）</Label>
              <Input
                id="specialTechnique"
                value={publicProfile.specialTechnique}
                onChange={(e) => handleChange('specialTechnique', e.target.value)}
                placeholder="超密着マッサージ"
                disabled={!isEditing}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="shopMessage">お店からの一言</Label>
            <Textarea
              id="shopMessage"
              value={publicProfile.shopMessage}
              onChange={(e) => handleChange('shopMessage', e.target.value)}
              placeholder="とっても人懐っこく、明るいセラピストです。"
              className="min-h-[120px]"
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerMessage">お客様へのメッセージ</Label>
            <Textarea
              id="customerMessage"
              value={publicProfile.customerMessage}
              onChange={(e) => handleChange('customerMessage', e.target.value)}
              placeholder="初めまして♡ あいりと申します✨✨"
              className="min-h-[120px]"
              disabled={!isEditing}
            />
          </div>
        </FormSection>

        {isEditing && (
          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={handleCancel} className="sm:min-w-[120px]">
              <X className="mr-2 h-4 w-4" />
              キャンセル
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 sm:min-w-[160px]">
              <Save className="mr-2 h-4 w-4" />
              保存
            </Button>
          </div>
        )}
      </form>
    </div>
  )
}

"use client"

import React, { useState } from "react"
import { Cast, PublicProfile } from "@/lib/cast/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Save, X } from "lucide-react"

interface PublicProfileFormProps {
  cast: Cast
  onSubmit: (data: PublicProfile) => void
  onCancel?: () => void
  isEditing?: boolean
  setIsEditing?: (editing: boolean) => void
}

export function PublicProfileForm({ cast, onSubmit, onCancel, isEditing = false, setIsEditing }: PublicProfileFormProps) {
  const [publicProfile, setPublicProfile] = useState<PublicProfile>({
    bustCup: cast?.publicProfile?.bustCup || "",
    bodyType: cast?.publicProfile?.bodyType || [],
    personality: cast?.publicProfile?.personality || [],
    availableServices: cast?.publicProfile?.availableServices || [],
    smoking: cast?.publicProfile?.smoking || "吸わない",
    massageQualification: cast?.publicProfile?.massageQualification || false,
    qualificationDetails: cast?.publicProfile?.qualificationDetails || [],
    homeVisit: cast?.publicProfile?.homeVisit || "NG",
    tattoo: cast?.publicProfile?.tattoo || "なし",
    bloodType: cast?.publicProfile?.bloodType || "秘密",
    birthplace: cast?.publicProfile?.birthplace || "",
    foreignerOk: cast?.publicProfile?.foreignerOk || "NG",
    hobbies: cast?.publicProfile?.hobbies || "",
    charmPoint: cast?.publicProfile?.charmPoint || "",
    personalityOneWord: cast?.publicProfile?.personalityOneWord || "",
    favoriteType: cast?.publicProfile?.favoriteType || "",
    favoriteFood: cast?.publicProfile?.favoriteFood || "",
    specialTechnique: cast?.publicProfile?.specialTechnique || "",
    shopMessage: cast?.publicProfile?.shopMessage || "",
    customerMessage: cast?.publicProfile?.customerMessage || "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(publicProfile)
    if (setIsEditing) setIsEditing(false)
  }

  const handleCancel = () => {
    // Reset to original values
    setPublicProfile({
      bustCup: cast?.publicProfile?.bustCup || "",
      bodyType: cast?.publicProfile?.bodyType || [],
      personality: cast?.publicProfile?.personality || [],
      availableServices: cast?.publicProfile?.availableServices || [],
      smoking: cast?.publicProfile?.smoking || "吸わない",
      massageQualification: cast?.publicProfile?.massageQualification || false,
      qualificationDetails: cast?.publicProfile?.qualificationDetails || [],
      homeVisit: cast?.publicProfile?.homeVisit || "NG",
      tattoo: cast?.publicProfile?.tattoo || "なし",
      bloodType: cast?.publicProfile?.bloodType || "秘密",
      birthplace: cast?.publicProfile?.birthplace || "",
      foreignerOk: cast?.publicProfile?.foreignerOk || "NG",
      hobbies: cast?.publicProfile?.hobbies || "",
      charmPoint: cast?.publicProfile?.charmPoint || "",
      personalityOneWord: cast?.publicProfile?.personalityOneWord || "",
      favoriteType: cast?.publicProfile?.favoriteType || "",
      favoriteFood: cast?.publicProfile?.favoriteFood || "",
      specialTechnique: cast?.publicProfile?.specialTechnique || "",
      shopMessage: cast?.publicProfile?.shopMessage || "",
      customerMessage: cast?.publicProfile?.customerMessage || "",
    })
    if (setIsEditing) setIsEditing(false)
    if (onCancel) onCancel()
  }

  const handleChange = (field: keyof PublicProfile, value: any) => {
    setPublicProfile(prev => ({ ...prev, [field]: value }))
  }

  const handleArrayToggle = (field: keyof PublicProfile, value: string) => {
    setPublicProfile(prev => {
      const currentArray = prev[field] as string[]
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
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
        {/* スタイル情報 */}
        <Card>
          <CardHeader>
            <CardTitle>スタイル情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bustCup">カップサイズ</Label>
                <Input
                  id="bustCup"
                  value={publicProfile.bustCup}
                  onChange={(e) => handleChange("bustCup", e.target.value)}
                  placeholder="E"
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthplace">出身地</Label>
                <Input
                  id="birthplace"
                  value={publicProfile.birthplace}
                  onChange={(e) => handleChange("birthplace", e.target.value)}
                  placeholder="関東地方"
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>体型</Label>
              <div className="grid grid-cols-3 gap-2">
                {["スレンダー", "普通", "グラマー", "ぽっちゃり", "小柄", "長身"].map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`bodyType-${type}`}
                      checked={publicProfile.bodyType.includes(type)}
                      onCheckedChange={() => handleArrayToggle("bodyType", type)}
                      disabled={!isEditing}
                    />
                    <Label htmlFor={`bodyType-${type}`} className="text-sm">{type}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>個性</Label>
              <div className="grid grid-cols-2 gap-2">
                {["正統派セラピスト", "清楚なお姉さん", "モデルなみのスタイル", "エッチなお姉さん", "魅惑の人妻", "エロすぎる痴女"].map((personality) => (
                  <div key={personality} className="flex items-center space-x-2">
                    <Checkbox
                      id={`personality-${personality}`}
                      checked={publicProfile.personality.includes(personality)}
                      onCheckedChange={() => handleArrayToggle("personality", personality)}
                      disabled={!isEditing}
                    />
                    <Label htmlFor={`personality-${personality}`} className="text-sm">{personality}</Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 可能プレイ */}
        <Card>
          <CardHeader>
            <CardTitle>可能プレイ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {["睾丸マッサージ", "パウダーマッサージ", "オイルマッサージ", "指圧マッサージ", "全身マッサージ", "密着フェザータッチ", "鼠径部回春", "上半身リップ", "洗体サーサービス", "全身密着泡洗体", "トップレス", "Tバック", "手コキ"].map((service) => (
                <div key={service} className="flex items-center space-x-2">
                  <Checkbox
                    id={`service-${service}`}
                    checked={publicProfile.availableServices.includes(service)}
                    onCheckedChange={() => handleArrayToggle("availableServices", service)}
                    disabled={!isEditing}
                  />
                  <Label htmlFor={`service-${service}`} className="text-sm">{service}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 検索用情報 */}
        <Card>
          <CardHeader>
            <CardTitle>検索用情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>タバコ</Label>
                <Select
                  value={publicProfile.smoking}
                  onValueChange={(value: any) => handleChange("smoking", value)}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="吸わない">吸わない</SelectItem>
                    <SelectItem value="吸う">吸う</SelectItem>
                    <SelectItem value="電子タバコ">電子タバコ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>血液型</Label>
                <Select
                  value={publicProfile.bloodType}
                  onValueChange={(value: any) => handleChange("bloodType", value)}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="O">O</SelectItem>
                    <SelectItem value="AB">AB</SelectItem>
                    <SelectItem value="秘密">秘密</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>自宅派遣</Label>
                <Select
                  value={publicProfile.homeVisit}
                  onValueChange={(value: any) => handleChange("homeVisit", value)}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NG">NG</SelectItem>
                    <SelectItem value="OK">OK</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>タトゥー</Label>
                <Select
                  value={publicProfile.tattoo}
                  onValueChange={(value: any) => handleChange("tattoo", value)}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="なし">なし</SelectItem>
                    <SelectItem value="ある">ある</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>外国人</Label>
                <Select
                  value={publicProfile.foreignerOk}
                  onValueChange={(value: any) => handleChange("foreignerOk", value)}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NG">NG</SelectItem>
                    <SelectItem value="OK">OK</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="massageQualification"
                checked={publicProfile.massageQualification}
                onCheckedChange={(checked) => handleChange("massageQualification", checked)}
                disabled={!isEditing}
              />
              <Label htmlFor="massageQualification">エステ・マッサージ資格</Label>
            </div>

            {publicProfile.massageQualification && (
              <div className="space-y-2">
                <Label>資格詳細</Label>
                <Textarea
                  value={publicProfile.qualificationDetails.join("\n")}
                  onChange={(e) => handleChange("qualificationDetails", e.target.value.split("\n"))}
                  placeholder="メンズエステ経験者&#10;アロマリンパドレナージュ&#10;前立腺マッサージ対応"
                  className="min-h-[80px]"
                  disabled={!isEditing}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* 個人情報 */}
        <Card>
          <CardHeader>
            <CardTitle>個人情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hobbies">趣味・特技</Label>
                <Input
                  id="hobbies"
                  value={publicProfile.hobbies}
                  onChange={(e) => handleChange("hobbies", e.target.value)}
                  placeholder="料理"
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="charmPoint">チャームポイント</Label>
                <Input
                  id="charmPoint"
                  value={publicProfile.charmPoint}
                  onChange={(e) => handleChange("charmPoint", e.target.value)}
                  placeholder="目♡"
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="personalityOneWord">性格を一言で</Label>
                <Input
                  id="personalityOneWord"
                  value={publicProfile.personalityOneWord}
                  onChange={(e) => handleChange("personalityOneWord", e.target.value)}
                  placeholder="明るい"
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="favoriteType">好きな男性タイプ</Label>
                <Input
                  id="favoriteType"
                  value={publicProfile.favoriteType}
                  onChange={(e) => handleChange("favoriteType", e.target.value)}
                  placeholder="紳士な人♡"
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="favoriteFood">好きな食べ物</Label>
                <Input
                  id="favoriteFood"
                  value={publicProfile.favoriteFood}
                  onChange={(e) => handleChange("favoriteFood", e.target.value)}
                  placeholder="ぷりん"
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialTechnique">私の奥義（金の技）</Label>
                <Input
                  id="specialTechnique"
                  value={publicProfile.specialTechnique}
                  onChange={(e) => handleChange("specialTechnique", e.target.value)}
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
                onChange={(e) => handleChange("shopMessage", e.target.value)}
                placeholder="とっても人懐っこく、とっても明るいキレ可愛いセラピストさん。"
                className="min-h-[100px]"
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerMessage">お客様へのメッセージ</Label>
              <Textarea
                id="customerMessage"
                value={publicProfile.customerMessage}
                onChange={(e) => handleChange("customerMessage", e.target.value)}
                placeholder="初めまして♡ あいりと申します✨✨"
                className="min-h-[100px]"
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {isEditing && (
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={handleCancel}>
              <X className="w-4 h-4 mr-2" />
              キャンセル
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
              <Save className="w-4 h-4 mr-2" />
              保存
            </Button>
          </div>
        )}
      </form>
    </div>
  )
}
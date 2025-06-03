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
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"

interface CastFormProps {
  staff?: Cast | null
  onSubmit: (data: Partial<Cast>) => void
}

export function StaffForm({ staff, onSubmit }: CastFormProps) {
  const [formData, setFormData] = useState({
    name: staff?.name || "",
    nameKana: staff?.nameKana || "",
    age: staff?.age || "",
    height: staff?.height || "",
    bust: staff?.bust || "",
    waist: staff?.waist || "",
    hip: staff?.hip || "",
    type: staff?.type || "カワイイ系",
    image: staff?.image || "",
    description: staff?.description || "",
    netReservation: staff?.netReservation ?? true,
    specialDesignationFee: staff?.specialDesignationFee || "",
    regularDesignationFee: staff?.regularDesignationFee || "",
    workStatus: staff?.workStatus || "出勤",
    courseTypes: staff?.courseTypes || ["基本コース"],
    phone: "",
    email: "",
    password: "",
    birthDate: "",
    registrationDate: new Date().toISOString().split('T')[0],
    blogId: "",
    twitterId: "",
  })

  const [publicProfile, setPublicProfile] = useState<PublicProfile>({
    bustCup: staff?.publicProfile?.bustCup || "",
    bodyType: staff?.publicProfile?.bodyType || [],
    personality: staff?.publicProfile?.personality || [],
    availableServices: staff?.publicProfile?.availableServices || [],
    smoking: staff?.publicProfile?.smoking || "吸わない",
    massageQualification: staff?.publicProfile?.massageQualification || false,
    qualificationDetails: staff?.publicProfile?.qualificationDetails || [],
    homeVisit: staff?.publicProfile?.homeVisit || "NG",
    tattoo: staff?.publicProfile?.tattoo || "なし",
    bloodType: staff?.publicProfile?.bloodType || "秘密",
    birthplace: staff?.publicProfile?.birthplace || "",
    foreignerOk: staff?.publicProfile?.foreignerOk || "NG",
    hobbies: staff?.publicProfile?.hobbies || "",
    charmPoint: staff?.publicProfile?.charmPoint || "",
    personalityOneWord: staff?.publicProfile?.personalityOneWord || "",
    favoriteType: staff?.publicProfile?.favoriteType || "",
    favoriteFood: staff?.publicProfile?.favoriteFood || "",
    specialTechnique: staff?.publicProfile?.specialTechnique || "",
    shopMessage: staff?.publicProfile?.shopMessage || "",
    customerMessage: staff?.publicProfile?.customerMessage || "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ ...formData, publicProfile })
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }))
  }

  const handlePublicProfileChange = (field: keyof PublicProfile, value: any) => {
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">源氏名</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nameKana">本名</Label>
              <Input
                id="nameKana"
                name="nameKana"
                value={formData.nameKana}
                onChange={handleInputChange}
                required
              />
              <span className="text-sm text-red-500">※ひらがなが必須</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">TEL</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="twitter">Twitter</Label>
            <Input
              id="twitter"
              name="twitterId"
              value={formData.twitterId}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="blogId">ブログウィジェット</Label>
            <Input
              id="blogId"
              name="blogId"
              value={formData.blogId}
              onChange={handleInputChange}
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
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
        </CardContent>
      </Card>


      {/* プロフィール情報 */}
      <Card>
        <CardHeader>
          <CardTitle>プロフィール情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="height">身長</Label>
              <Input
                id="height"
                name="height"
                type="number"
                value={formData.height}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bust">バスト</Label>
              <Input
                id="bust"
                name="bust"
                value={formData.bust}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="waist">ウエスト</Label>
              <Input
                id="waist"
                name="waist"
                type="number"
                value={formData.waist}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">タイプ</Label>
            <Select
              name="type"
              value={formData.type}
              onValueChange={(value) => handleInputChange({ target: { name: "type", value } } as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="カワイイ系">カワイイ系</SelectItem>
                <SelectItem value="キレイ系">キレイ系</SelectItem>
                <SelectItem value="セクシー系">セクシー系</SelectItem>
                <SelectItem value="お姉さん系">お姉さん系</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">プロフィール文</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* 予約設定 */}
      <Card>
        <CardHeader>
          <CardTitle>予約設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="netReservation">ネット予約</Label>
            <Switch
              id="netReservation"
              checked={formData.netReservation}
              onCheckedChange={(checked) => handleSwitchChange("netReservation", checked)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="specialDesignationFee">特別指名料</Label>
              <Input
                id="specialDesignationFee"
                name="specialDesignationFee"
                type="number"
                value={formData.specialDesignationFee}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regularDesignationFee">本指名料</Label>
              <Input
                id="regularDesignationFee"
                name="regularDesignationFee"
                type="number"
                value={formData.regularDesignationFee}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>コースタイプ</Label>
            <Select
              name="courseTypes"
              value={formData.courseTypes[0]}
              onValueChange={(value) => handleInputChange({ target: { name: "courseTypes", value: [value] } } as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="基本コース">基本コース</SelectItem>
                <SelectItem value="イベントコース">イベントコース</SelectItem>
                <SelectItem value="プレミアムコース">プレミアムコース</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 公開プロフィール情報 */}
      <Card>
        <CardHeader>
          <CardTitle>公開プロフィール情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* スタイル情報 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">スタイル</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bustCup">カップサイズ</Label>
                <Input
                  id="bustCup"
                  value={publicProfile.bustCup}
                  onChange={(e) => handlePublicProfileChange("bustCup", e.target.value)}
                  placeholder="E"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthplace">出身地</Label>
                <Input
                  id="birthplace"
                  value={publicProfile.birthplace}
                  onChange={(e) => handlePublicProfileChange("birthplace", e.target.value)}
                  placeholder="関東地方"
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
                    />
                    <Label htmlFor={`personality-${personality}`} className="text-sm">{personality}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* 可能プレイ */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">可能プレイ</h3>
            <div className="grid grid-cols-2 gap-2">
              {["睾丸マッサージ", "パウダーマッサージ", "オイルマッサージ", "指圧マッサージ", "全身マッサージ", "密着フェザータッチ", "鼠径部回春", "上半身リップ", "洗体サーサービス", "全身密着泡洗体", "トップレス", "Tバック", "手コキ"].map((service) => (
                <div key={service} className="flex items-center space-x-2">
                  <Checkbox
                    id={`service-${service}`}
                    checked={publicProfile.availableServices.includes(service)}
                    onCheckedChange={() => handleArrayToggle("availableServices", service)}
                  />
                  <Label htmlFor={`service-${service}`} className="text-sm">{service}</Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* 検索用情報 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">検索用</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>タバコ</Label>
                <Select
                  value={publicProfile.smoking}
                  onValueChange={(value: any) => handlePublicProfileChange("smoking", value)}
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
                  onValueChange={(value: any) => handlePublicProfileChange("bloodType", value)}
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
                  onValueChange={(value: any) => handlePublicProfileChange("homeVisit", value)}
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
                  onValueChange={(value: any) => handlePublicProfileChange("tattoo", value)}
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
                  onValueChange={(value: any) => handlePublicProfileChange("foreignerOk", value)}
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
                onCheckedChange={(checked) => handlePublicProfileChange("massageQualification", checked)}
              />
              <Label htmlFor="massageQualification">エステ・マッサージ資格</Label>
            </div>

            {publicProfile.massageQualification && (
              <div className="space-y-2">
                <Label>資格詳細</Label>
                <Textarea
                  value={publicProfile.qualificationDetails.join("\n")}
                  onChange={(e) => handlePublicProfileChange("qualificationDetails", e.target.value.split("\n"))}
                  placeholder="メンズエステ経験者&#10;アロマリンパドレナージュ&#10;前立腺マッサージ対応"
                  className="min-h-[80px]"
                />
              </div>
            )}
          </div>

          <Separator />

          {/* 個人情報 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">個人情報</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hobbies">趣味・特技</Label>
                <Input
                  id="hobbies"
                  value={publicProfile.hobbies}
                  onChange={(e) => handlePublicProfileChange("hobbies", e.target.value)}
                  placeholder="料理"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="charmPoint">チャームポイント</Label>
                <Input
                  id="charmPoint"
                  value={publicProfile.charmPoint}
                  onChange={(e) => handlePublicProfileChange("charmPoint", e.target.value)}
                  placeholder="目♡"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="personalityOneWord">性格を一言で</Label>
                <Input
                  id="personalityOneWord"
                  value={publicProfile.personalityOneWord}
                  onChange={(e) => handlePublicProfileChange("personalityOneWord", e.target.value)}
                  placeholder="明るい"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="favoriteType">好きな男性タイプ</Label>
                <Input
                  id="favoriteType"
                  value={publicProfile.favoriteType}
                  onChange={(e) => handlePublicProfileChange("favoriteType", e.target.value)}
                  placeholder="紳士な人♡"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="favoriteFood">好きな食べ物</Label>
                <Input
                  id="favoriteFood"
                  value={publicProfile.favoriteFood}
                  onChange={(e) => handlePublicProfileChange("favoriteFood", e.target.value)}
                  placeholder="ぷりん"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialTechnique">私の奥義（金の技）</Label>
                <Input
                  id="specialTechnique"
                  value={publicProfile.specialTechnique}
                  onChange={(e) => handlePublicProfileChange("specialTechnique", e.target.value)}
                  placeholder="超密着マッサージ"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shopMessage">お店からの一言</Label>
              <Textarea
                id="shopMessage"
                value={publicProfile.shopMessage}
                onChange={(e) => handlePublicProfileChange("shopMessage", e.target.value)}
                placeholder="とっても人懐っこく、とっても明るいキレ可愛いセラピストさん。"
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerMessage">お客様へのメッセージ</Label>
              <Textarea
                id="customerMessage"
                value={publicProfile.customerMessage}
                onChange={(e) => handlePublicProfileChange("customerMessage", e.target.value)}
                placeholder="初めまして♡ あいりと申します✨✨"
                className="min-h-[100px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline">
          キャンセル
        </Button>
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
          保存
        </Button>
      </div>
    </form>
  )
}

"use client"

import React, { useState } from "react"
import { Cast } from "@/lib/cast/types"
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


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
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

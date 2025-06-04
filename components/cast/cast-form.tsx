"use client"

import React, { useState } from "react"
import { Cast } from "@/lib/cast/types"
import { options } from "@/lib/course-option/data"
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
  cast?: Cast | null
  onSubmit: (data: Partial<Cast>) => void
}

export function CastForm({ cast, onSubmit }: CastFormProps) {
  const [formData, setFormData] = useState({
    name: cast?.name || "",
    nameKana: cast?.nameKana || "",
    age: cast?.age || "",
    height: cast?.height || "",
    bust: cast?.bust || "",
    waist: cast?.waist || "",
    hip: cast?.hip || "",
    type: cast?.type || "カワイイ系",
    image: cast?.image || "",
    description: cast?.description || "",
    netReservation: cast?.netReservation ?? true,
    specialDesignationFee: cast?.specialDesignationFee || "",
    regularDesignationFee: cast?.regularDesignationFee || "",
    panelDesignationRank: cast?.panelDesignationRank || 0,
    regularDesignationRank: cast?.regularDesignationRank || 0,
    workStatus: cast?.workStatus || "出勤",
    availableOptions: cast?.availableOptions || [],
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

  const handleOptionChange = (optionId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      availableOptions: checked 
        ? [...prev.availableOptions, optionId]
        : prev.availableOptions.filter(id => id !== optionId)
    }))
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="panelDesignationRank">パネル指名ランク</Label>
              <Input
                id="panelDesignationRank"
                name="panelDesignationRank"
                type="number"
                min="0"
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
                min="0"
                value={formData.regularDesignationRank}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 可能オプション */}
      <Card>
        <CardHeader>
          <CardTitle>可能オプション</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {options.map((option) => (
              <div key={option.id} className="flex items-center space-x-2">
                <Checkbox
                  id={option.id}
                  checked={formData.availableOptions.includes(option.id)}
                  onCheckedChange={(checked) => handleOptionChange(option.id, !!checked)}
                />
                <Label htmlFor={option.id} className="text-sm">
                  {option.name}
                  <span className="ml-2 text-gray-500">
                    {option.price === 0 ? "0円" : `${option.price.toLocaleString()}円`}
                  </span>
                </Label>
              </div>
            ))}
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

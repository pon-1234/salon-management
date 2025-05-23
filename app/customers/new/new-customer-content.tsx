"use client"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function NewCustomerContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    age: '',
    memberType: 'regular',
    smsEnabled: true,
    notes: '',
  })

  useEffect(() => {
    const phone = searchParams.get('phone')
    if (phone && phone !== formData.phone) {
      setFormData(prev => ({ ...prev, phone }))
    }
  }, [searchParams, formData.phone])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => {
      if (prev[name as keyof typeof prev] !== value) {
        return { ...prev, [name]: value }
      }
      return prev
    })
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would typically send the data to your backend
    console.log('Form submitted:', formData)
    // For now, we'll just redirect to a mock customer page
    router.push('/customers/1')
  }

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">新規顧客登録</h1>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">名前</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>
          <div>
            <Label htmlFor="phone">電話番号</Label>
            <Input
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              required
            />
          </div>
          <div>
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <Label>生年月日</Label>
            <div className="flex gap-2">
              <Select
                name="birthYear"
                value={formData.birthYear}
                onValueChange={(value) => handleSelectChange('birthYear', value)}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="年" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                name="birthMonth"
                value={formData.birthMonth}
                onValueChange={(value) => handleSelectChange('birthMonth', value)}
              >
                <SelectTrigger className="w-[80px]">
                  <SelectValue placeholder="月" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <SelectItem key={month} value={month.toString()}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                name="birthDay"
                value={formData.birthDay}
                onValueChange={(value) => handleSelectChange('birthDay', value)}
              >
                <SelectTrigger className="w-[80px]">
                  <SelectValue placeholder="日" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="age">年齢</Label>
            <Input
              id="age"
              name="age"
              type="number"
              value={formData.age}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <Label htmlFor="memberType">会員タイプ</Label>
            <Select
              name="memberType"
              value={formData.memberType}
              onValueChange={(value) => handleSelectChange('memberType', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">通常会員</SelectItem>
                <SelectItem value="vip">VIPメンバー</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="smsEnabled"
            checked={formData.smsEnabled}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, smsEnabled: checked as boolean }))}
          />
          <Label htmlFor="smsEnabled">SMS送信を許可する</Label>
        </div>
        <div>
          <Label htmlFor="notes">備考</Label>
          <Textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            className="h-32"
          />
        </div>
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
          登録
        </Button>
      </form>
    </>
  )
} 
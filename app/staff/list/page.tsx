"use client"

import { useState, useEffect } from 'react'
import { Header } from "@/components/header"
import { StaffListView } from "@/components/staff/staff-list-view"
import { Staff } from "@/lib/staff/types"
import { getAllStaff } from "@/lib/staff/data"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PlusCircle } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"

export default function StaffListPage() {
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [workStatus, setWorkStatus] = useState("就業中(公開)")
  const [page, setPage] = useState("1")
  const [phoneSearch, setPhoneSearch] = useState("")
  const [nameSearch, setNameSearch] = useState("")

  useEffect(() => {
    const staff = getAllStaff()
    setStaffList(staff)
  }, [])

  const filteredStaff = staffList.filter(staff => {
    const matchesPhone = staff.phone?.includes(phoneSearch) ?? true
    const matchesName = staff.name.toLowerCase().includes(nameSearch.toLowerCase()) ||
                       staff.nameKana.toLowerCase().includes(nameSearch.toLowerCase())
    return matchesPhone && matchesName
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto py-6 px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">スタッフ一覧</h1>
          <Link href="/staff/manage/new">
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <PlusCircle className="w-4 h-4 mr-2" />
              新規スタッフ追加
            </Button>
          </Link>
        </div>

        <div className="flex gap-4 mb-6">
          <Select value={workStatus} onValueChange={setWorkStatus}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="就業中(公開)">就業中(公開)</SelectItem>
              <SelectItem value="休職中">休職中</SelectItem>
              <SelectItem value="退職">退職</SelectItem>
            </SelectContent>
          </Select>

          <Select value={page} onValueChange={setPage}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="ページ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="search"
            placeholder="TEL検索"
            value={phoneSearch}
            onChange={(e) => setPhoneSearch(e.target.value)}
            className="w-[200px]"
          />

          <Input
            type="search"
            placeholder="本名検索"
            value={nameSearch}
            onChange={(e) => setNameSearch(e.target.value)}
            className="w-[200px]"
          />
        </div>

        <div className="text-red-500 mb-4">
          ※業務連絡を開くと既読になりますのでご注意下さい。
        </div>

        <StaffListView staff={filteredStaff} />
      </main>
    </div>
  )
}

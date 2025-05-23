"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { StaffForm } from "@/components/staff/staff-form"
import { Staff } from "@/lib/staff/types"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from 'lucide-react'
import { getAllStaff } from "@/lib/staff/data"

export default function StaffManagePage({ params }: { params: { id: string } }) {
  const [staff, setStaff] = useState<Staff | null>(null)
  const router = useRouter()
  const isNewStaff = params.id === "new"

  useEffect(() => {
    const fetchStaff = async () => {
      const staffList = getAllStaff()
      const foundStaff = staffList.find(s => s.id === params.id)
      setStaff(foundStaff || null);
    }

    fetchStaff()
  }, [params.id, isNewStaff])

  const handleSubmit = async (data: Partial<Staff>) => {
    // In a real application, this would make an API call
    console.log("Submitting staff data:", data)
    router.push("/staff/list")
  }

  if (!isNewStaff && !staff) {
    return <div>Loading...</div>
  }


  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto py-6 px-4">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            戻る
          </Button>
          <h1 className="text-2xl font-bold">
            {isNewStaff ? "新規スタッフ登録" : "スタッフ情報編集"}
          </h1>
        </div>
        <div className="max-w-2xl mx-auto">
          <StaffForm
            staff={staff}
            onSubmit={handleSubmit}
          />
        </div>
      </main>
    </div>
  )
}

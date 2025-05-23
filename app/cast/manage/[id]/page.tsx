"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { StaffForm } from "@/components/cast/cast-form"
import { Cast } from "@/lib/cast/types"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from 'lucide-react'
import { getAllCasts } from "@/lib/cast/data"

export default function CastManagePage({ params }: { params: { id: string } }) {
  const [cast, setCast] = useState<Cast | null>(null)
  const router = useRouter()
  const isNewCast = params.id === "new"

  useEffect(() => {
    const fetchCast = async () => {
      const castList = getAllCasts()
      const foundCast = castList.find(c => c.id === params.id)
      setCast(foundCast || null);
    }

    fetchCast()
  }, [params.id, isNewCast])

  const handleSubmit = async (data: Partial<Cast>) => {
    // In a real application, this would make an API call
    console.log("Submitting cast data:", data)
    router.push("/cast/list")
  }

  if (!isNewCast && !cast) {
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
            {isNewCast ? "新規キャスト登録" : "キャスト情報編集"}
          </h1>
        </div>
        <div className="max-w-2xl mx-auto">
          <StaffForm
            staff={cast}
            onSubmit={handleSubmit}
          />
        </div>
      </main>
    </div>
  )
}

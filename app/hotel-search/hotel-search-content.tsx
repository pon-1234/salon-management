"use client"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { PlusCircle, Pencil, Trash2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

// Mock hotel data
const mockHotels = [
  {
    id: '1',
    name: 'ホテル ABC',
    category: 'ラブホテル',
    address: '東京都池袋1-1-1',
    phone: '03-1234-5678',
    area: '池袋',
    displayOrder: 1,
    isRecommended: true
  },
  {
    id: '2',
    name: 'ホテル XYZ',
    category: 'ラブホテル',
    address: '東京都池袋2-2-2',
    phone: '03-8765-4321',
    area: '池袋',
    displayOrder: 2,
    isRecommended: false
  }
];

export function HotelSearchContent() {
  const searchParams = useSearchParams()
  const query = searchParams.get('query')
  const [hotels, setHotels] = useState(mockHotels)

  useEffect(() => {
    if (query) {
      const filteredHotels = mockHotels.filter(
        hotel => 
          hotel.name.toLowerCase().includes(query.toLowerCase()) ||
          hotel.area.toLowerCase().includes(query.toLowerCase())
      );
      setHotels(filteredHotels);
    } else {
      setHotels(mockHotels);
    }
  }, [query]);

  const handleDelete = (id: string) => {
    setHotels(hotels.filter(hotel => hotel.id !== id))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto py-6 px-4">
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">ホテルリスト {query && `- 検索結果: ${query}`}</h1>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <PlusCircle className="w-4 h-4 mr-2" />
              新規追加
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            エリア名・ホテル名クリックで掲載/非掲載の切り替えができます。
          </p>
        </div>

        <div className="bg-white rounded-lg shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">カテゴリー/ホテル名</TableHead>
                <TableHead>住所</TableHead>
                <TableHead>電話番号</TableHead>
                <TableHead className="w-[100px]">エリア</TableHead>
                <TableHead className="w-[100px]">表示順</TableHead>
                <TableHead className="w-[100px]">ステータス</TableHead>
                <TableHead className="w-[100px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hotels.map((hotel) => (
                <TableRow key={hotel.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-gray-500">{hotel.category}</div>
                      <div className="font-bold text-emerald-600">{hotel.name}</div>
                    </div>
                  </TableCell>
                  <TableCell>{hotel.address}</TableCell>
                  <TableCell>{hotel.phone}</TableCell>
                  <TableCell>{hotel.area}</TableCell>
                  <TableCell>{hotel.displayOrder}</TableCell>
                  <TableCell>
                    {hotel.isRecommended ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                        掲載中
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        非掲載
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">編集</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                        onClick={() => handleDelete(hotel.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">削除</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  )
} 
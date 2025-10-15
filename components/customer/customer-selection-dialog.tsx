'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, User, Phone, Mail, Crown, Star, ChevronRight, UserPlus, Clock } from 'lucide-react'
import { customers as customerData } from '@/lib/customer/data'
import { Customer } from '@/lib/customer/types'
import { useRouter } from 'next/navigation'
import { cn, isVipMember } from '@/lib/utils'

interface CustomerSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CustomerSelectionDialog({ open, onOpenChange }: CustomerSelectionDialogProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>(customerData)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const router = useRouter()

  useEffect(() => {
    // 検索フィルタリング
    const filtered = customerData.filter((customer) => {
      const searchLower = searchTerm.toLowerCase()
      return (
        customer.name.toLowerCase().includes(searchLower) ||
        customer.phone.includes(searchTerm) ||
        customer.email.toLowerCase().includes(searchLower) ||
        customer.id.includes(searchTerm)
      )
    })
    setFilteredCustomers(filtered)
  }, [searchTerm])

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer)
  }

  const handleProceed = () => {
    if (selectedCustomer) {
      // 選択した顧客IDをクエリパラメータとして予約画面へ遷移
      router.push(`/admin/reservation?customerId=${selectedCustomer.id}`)
      onOpenChange(false)
    }
  }

  const handleNewCustomer = () => {
    // 新規顧客登録画面へ遷移
    router.push('/admin/customers/new')
    onOpenChange(false)
  }

  const handleOpenTimeline = () => {
    router.push('/admin/reservation')
    onOpenChange(false)
  }

  const getMemberBadge = (type: string) => {
    if (isVipMember(type)) {
      return (
        <Badge variant="default" className="bg-gradient-to-r from-yellow-400 to-yellow-600">
          <Crown className="mr-1 h-3 w-3" />
          VIP
        </Badge>
      )
    }
    return (
      <Badge variant="secondary">
        <Star className="mr-1 h-3 w-3" />
        通常会員
      </Badge>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">顧客を選択</DialogTitle>
          <DialogDescription>
            予約を作成する顧客を選択してください。新規顧客の場合は「新規顧客登録」をクリックしてください。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 検索バー */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <Input
              type="text"
              placeholder="名前、電話番号、メールアドレス、会員番号で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* 新規顧客登録ボタン */}
          <Button onClick={handleNewCustomer} variant="outline" className="w-full justify-start">
            <UserPlus className="mr-2 h-4 w-4" />
            新規顧客を登録
          </Button>

          {/* タイムライン確認ボタン */}
          <Button onClick={handleOpenTimeline} variant="secondary" className="w-full justify-start">
            <Clock className="mr-2 h-4 w-4" />
            タイムラインを確認する
          </Button>

          {/* 顧客リスト */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <Card
                    key={customer.id}
                    className={cn(
                      'cursor-pointer p-4 transition-all hover:shadow-md',
                      selectedCustomer?.id === customer.id && 'bg-purple-50 ring-2 ring-purple-600'
                    )}
                    onClick={() => handleCustomerSelect(customer)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-pink-400 font-semibold text-white">
                          {customer.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">{customer.name}</h3>
                            {getMemberBadge(customer.memberType)}
                          </div>
                          <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {customer.phone}
                            </span>
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {customer.email}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-gray-500">
                            会員番号: {customer.id} | ポイント: {customer.points}pt
                          </div>
                        </div>
                      </div>
                      {selectedCustomer?.id === customer.id && (
                        <ChevronRight className="h-5 w-5 text-purple-600" />
                      )}
                    </div>
                  </Card>
                ))
              ) : (
                <div className="py-8 text-center text-gray-500">
                  <User className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                  <p>検索条件に一致する顧客が見つかりません</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* アクションボタン */}
          <div className="flex items-center justify-between border-t pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleProceed}
              disabled={!selectedCustomer}
              className="bg-purple-600 hover:bg-purple-700"
            >
              この顧客で予約を作成
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

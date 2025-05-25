"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Phone, PhoneOff, User, Calendar, Star, AlertCircle } from 'lucide-react'
import { Customer } from "@/lib/customer/types"

interface IncomingCallPopupProps {
  isOpen: boolean
  phoneNumber: string
  customer?: Customer | null
  onAnswer: () => void
  onReject: () => void
  onViewDetails: () => void
  onClose: () => void
}

export function IncomingCallPopup({
  isOpen,
  phoneNumber,
  customer,
  onAnswer,
  onReject,
  onViewDetails,
  onClose
}: IncomingCallPopupProps) {

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <div className="space-y-4">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <div className="animate-pulse">
                <Phone className="w-6 h-6 text-emerald-600" />
              </div>
              <span className="text-lg font-semibold text-emerald-600">着信中</span>
            </div>
            <div className="text-2xl font-mono font-bold">{phoneNumber}</div>
          </div>

          {/* Customer Information */}
          {customer ? (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <img
                    src={customer.image || "/placeholder-user.jpg"}
                    alt={customer.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div className="flex-1 space-y-2">
                    <div>
                      <div className="font-semibold text-lg">{customer.name} 様</div>
                      <div className="text-sm text-gray-500">{customer.nameKana}</div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Badge variant={customer.memberType === 'vip' ? 'default' : 'secondary'}>
                        {customer.memberType === 'vip' ? 'VIP会員' : '一般会員'}
                      </Badge>
                      {customer.points && customer.points > 0 && (
                        <Badge variant="outline">
                          <Star className="w-3 h-3 mr-1" />
                          {customer.points}pt
                        </Badge>
                      )}
                    </div>

                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>来店回数: {customer.visitCount || 0}回</span>
                      </div>
                      {customer.lastVisit && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>前回来店: {customer.lastVisit}</span>
                        </div>
                      )}
                    </div>

                    {/* 要注意事項 */}
                    {customer.notes && (
                      <div className="flex items-start gap-2 p-2 bg-yellow-50 rounded">
                        <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-yellow-800">{customer.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4 text-center">
                <User className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                <div className="font-medium">新規のお客様</div>
                <div className="text-sm text-gray-500">登録されていない電話番号です</div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={onAnswer}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              size="lg"
            >
              <Phone className="w-5 h-5 mr-2" />
              応答
            </Button>
            <Button
              onClick={onReject}
              variant="destructive"
              className="flex-1"
              size="lg"
            >
              <PhoneOff className="w-5 h-5 mr-2" />
              拒否
            </Button>
          </div>

          {customer && (
            <Button
              onClick={onViewDetails}
              variant="outline"
              className="w-full"
            >
              顧客詳細を表示
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
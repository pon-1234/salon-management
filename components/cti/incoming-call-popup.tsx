'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Phone, PhoneOff, User, Calendar, Star, AlertCircle } from 'lucide-react'
import { Customer } from '@/lib/customer/types'
import { isVipMember } from '@/lib/utils'

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
  onClose,
}: IncomingCallPopupProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="mx-auto max-w-md">
        <div className="space-y-4">
          {/* Header */}
          <div className="space-y-2 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="animate-pulse">
                <Phone className="h-6 w-6 text-emerald-600" />
              </div>
              <span className="text-lg font-semibold text-emerald-600">着信中</span>
            </div>
            <div className="font-mono text-2xl font-bold">{phoneNumber}</div>
          </div>

          {/* Customer Information */}
          {customer ? (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/non-photo.svg"
                    alt={customer.name}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                  <div className="flex-1 space-y-2">
                    <div>
                      <div className="text-lg font-semibold">{customer.name} 様</div>
                      <div className="text-sm text-gray-500">{customer.nameKana}</div>
                    </div>

                    <div className="flex gap-2">
                      <Badge variant={isVipMember(customer.memberType) ? 'default' : 'secondary'}>
                        {isVipMember(customer.memberType) ? 'VIP会員' : '一般会員'}
                      </Badge>
                      {customer.points && customer.points > 0 && (
                        <Badge variant="outline">
                          <Star className="mr-1 h-3 w-3" />
                          {customer.points}pt
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>来店回数: 0回</span>
                      </div>
                      {customer.lastVisitDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            前回来店: {new Date(customer.lastVisitDate).toLocaleDateString('ja-JP')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 要注意事項 */}
                    {customer.notes && (
                      <div className="flex items-start gap-2 rounded bg-yellow-50 p-2">
                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600" />
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
                <User className="mx-auto mb-2 h-12 w-12 text-gray-400" />
                <div className="font-medium">新規のお客様</div>
                <div className="text-sm text-gray-500">登録されていない電話番号です</div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={onAnswer}
              className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
              size="lg"
            >
              <Phone className="mr-2 h-5 w-5" />
              応答
            </Button>
            <Button onClick={onReject} variant="destructive" className="flex-1" size="lg">
              <PhoneOff className="mr-2 h-5 w-5" />
              拒否
            </Button>
          </div>

          {customer && (
            <Button onClick={onViewDetails} variant="outline" className="w-full">
              顧客詳細を表示
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

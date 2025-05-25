"use client"

import { Button } from "@/components/ui/button"
import { Phone } from 'lucide-react'
import { useCTI } from "@/hooks/use-cti"

export function CTIDemoButton() {
  const { simulateIncomingCall, isConnected } = useCTI()

  const testCalls = [
    { label: "既存顧客（田中花子）", phone: "03-1234-5678" },
    { label: "VIP顧客（佐藤美咲）", phone: "090-1234-5678" },
    { label: "新規お客様", phone: "080-9999-9999" }
  ]

  if (!isConnected) {
    return (
      <div className="text-sm text-gray-500">
        CTI未接続
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">CTI着信テスト</div>
      <div className="flex gap-2 flex-wrap">
        {testCalls.map((call) => (
          <Button
            key={call.phone}
            variant="outline"
            size="sm"
            onClick={() => simulateIncomingCall(call.phone)}
            className="text-xs"
          >
            <Phone className="w-3 h-3 mr-1" />
            {call.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
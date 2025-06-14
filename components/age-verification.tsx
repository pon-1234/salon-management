'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield } from 'lucide-react'

interface AgeVerificationProps {
  onVerify: (isAdult: boolean) => void
}

export function AgeVerification({ onVerify }: AgeVerificationProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-gray-700" />
          </div>
          <CardTitle className="text-2xl font-bold">年齢確認</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center text-gray-600">
            <p className="mb-2">当サイトは18歳未満の方の</p>
            <p>ご利用をお断りしております。</p>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={() => onVerify(true)}
              className="w-full"
              size="lg"
            >
              18歳以上です
            </Button>
            <Button 
              onClick={() => onVerify(false)}
              variant="outline"
              className="w-full"
              size="lg"
            >
              18歳未満です
            </Button>
          </div>
          
          <p className="text-xs text-center text-gray-500">
            年齢を偽った場合、法的措置を取る場合があります。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
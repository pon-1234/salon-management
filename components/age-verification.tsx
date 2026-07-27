'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield } from 'lucide-react'

interface AgeVerificationProps {
  onVerify: (isAdult: boolean) => void | Promise<void>
  error?: string | null
}

export function AgeVerification({ onVerify, error }: AgeVerificationProps) {
  return (
    <div className="luxury-body flex min-h-screen items-center justify-center bg-luxury-black-deep px-4 text-luxury-gold-soft">
      <Card className="luxury-panel w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Shield className="h-12 w-12 text-luxury-gold" />
          </div>
          <CardTitle className="text-2xl font-bold">年齢確認</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center text-luxury-gold-muted">
            <p className="mb-2">当サイトは18歳未満の方の</p>
            <p>ご利用をお断りしております。</p>
          </div>

          <div className="space-y-3">
            <Button onClick={() => onVerify(true)} className="w-full" size="lg">
              18歳以上です
            </Button>
            <Button onClick={() => onVerify(false)} variant="outline" className="w-full" size="lg">
              18歳未満です
            </Button>
          </div>

          {error ? (
            <p role="alert" className="text-center text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <p className="text-center text-xs text-luxury-gold-muted">
            年齢を偽った場合、法的措置を取る場合があります。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

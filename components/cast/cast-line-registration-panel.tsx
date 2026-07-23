'use client'

/**
 * @design_doc   docs/ROUTING_STRUCTURE.md secure LINE cast registration flow
 * @related_to   POST /api/cast/line-registration-token issues the one-time command
 * @known_issues The plaintext command exists only in component memory and the issuance response
 */
import { useEffect, useState } from 'react'
import { Check, Copy, KeyRound, Unlink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface CastLineRegistrationPanelProps {
  castId: string
  storeId: string
  isLinked: boolean
}

interface IssuedCommand {
  command: string
  expiresAt: string
}

export function CastLineRegistrationPanel({
  castId,
  storeId,
  isLinked,
}: CastLineRegistrationPanelProps) {
  const [issued, setIssued] = useState<IssuedCommand | null>(null)
  const [linked, setLinked] = useState(isLinked)
  const [isIssuing, setIsIssuing] = useState(false)
  const [isUnlinking, setIsUnlinking] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLinked(isLinked)
  }, [isLinked])

  const issueCommand = async () => {
    setIsIssuing(true)
    setIssued(null)
    setCopied(false)
    setError(null)

    try {
      const response = await fetch(
        `/api/cast/line-registration-token?storeId=${encodeURIComponent(storeId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ castId }),
        }
      )
      const payload: unknown = await response.json()

      if (!response.ok) {
        throw new Error(readError(payload) ?? 'LINE招待コマンドを発行できませんでした')
      }
      if (!isIssuedCommand(payload)) {
        throw new Error('LINE招待コマンドの応答が不正です')
      }

      setIssued(payload)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'LINE招待コマンドを発行できませんでした')
    } finally {
      setIsIssuing(false)
    }
  }

  const copyCommand = async () => {
    if (!issued) return

    try {
      await navigator.clipboard.writeText(issued.command)
      setCopied(true)
    } catch {
      setError('コピーできませんでした。コマンドを手動で選択してください。')
    }
  }

  const unlinkAccount = async () => {
    if (!window.confirm('LINE連携を解除します。発行済みの招待コマンドも無効になります。')) {
      return
    }

    setIsUnlinking(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/cast/line-registration-token?storeId=${encodeURIComponent(storeId)}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ castId }),
        }
      )
      const payload: unknown = await response.json()
      if (!response.ok) {
        throw new Error(readError(payload) ?? 'LINE連携を解除できませんでした')
      }

      setIssued(null)
      setLinked(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'LINE連携を解除できませんでした')
    } finally {
      setIsUnlinking(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>LINEアカウント連携</CardTitle>
        <CardDescription>
          キャスト本人へ渡す、15分有効・一度限りの招待コマンドを発行します。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {linked ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm font-medium text-emerald-700">LINE連携済み</p>
            <Button type="button" variant="outline" onClick={unlinkAccount} disabled={isUnlinking}>
              <Unlink className="mr-2 h-4 w-4" />
              {isUnlinking ? '解除中...' : 'LINE連携を解除'}
            </Button>
          </div>
        ) : (
          <Button type="button" onClick={issueCommand} disabled={isIssuing}>
            <KeyRound className="mr-2 h-4 w-4" />
            {isIssuing ? '発行中...' : 'LINE招待コマンドを発行'}
          </Button>
        )}

        {issued && (
          <div className="space-y-3 rounded-md border border-amber-300 bg-amber-50 p-4">
            <p className="text-sm text-amber-900">
              この画面を離れると再表示できません。キャスト本人へ安全な方法で渡してください。
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="min-w-0 flex-1 overflow-x-auto rounded bg-white px-3 py-2 text-sm">
                {issued.command}
              </code>
              <Button type="button" variant="outline" onClick={copyCommand}>
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied ? 'コピー済み' : 'コピー'}
              </Button>
            </div>
            <p className="text-xs text-amber-800">
              有効期限: {new Date(issued.expiresAt).toLocaleString('ja-JP')}
            </p>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}

function isIssuedCommand(value: unknown): value is IssuedCommand {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.command === 'string' &&
    /^reg [A-Za-z0-9_-]{43}$/.test(record.command) &&
    typeof record.expiresAt === 'string' &&
    !Number.isNaN(Date.parse(record.expiresAt))
  )
}

function readError(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const error = (value as Record<string, unknown>).error
  return typeof error === 'string' && error.trim() ? error : null
}

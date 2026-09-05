'use client'

/**
 * @design_doc https://app.notion.com/p/3ccdda8d8bde80b19a27f2cd7dd8a2d1
 * @related_to CastForm: selects these internal rates; DesignationFee API: scoped persistence
 * @known_issues None
 */
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createDesignationFee,
  getDesignationFees,
  updateDesignationFee,
} from '@/lib/designation/data'
import type { DesignationFee } from '@/lib/designation/types'
import type { DesignationFeeKind } from '@/lib/designation/kind'
import { toast } from '@/hooks/use-toast'

const CATEGORIES = [
  { kind: 'free', label: 'フリー指名' },
  { kind: 'panel', label: 'パネル指名' },
  { kind: 'recommend', label: 'おすすめP指名' },
  { kind: 'repeat', label: '本指名' },
] as const

export function TakeHomeBonusSettings({ storeId }: { storeId: string }) {
  const [fees, setFees] = useState<DesignationFee[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError(false)
    setFees([])
    setDrafts({})
    getDesignationFees({ storeId, takeHomeOnly: true, includeInactive: true, surfaceErrors: true })
      .then((items) => {
        if (active) setFees(items)
      })
      .catch((error) => {
        console.error('Failed to load take-home rates:', error)
        if (active) setLoadError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [storeId])

  const persist = async (kind: DesignationFeeKind, label: string, existing?: DesignationFee) => {
    const key = existing?.id ?? kind
    const price = Number(drafts[key] ?? existing?.price ?? '')
    if (!Number.isSafeInteger(price) || price <= 0) {
      toast({ title: '1円以上の整数で金額を入力してください', variant: 'destructive' })
      return
    }
    if (
      fees.some(
        (fee) => fee.id !== existing?.id && fee.kind === kind && fee.price === price && fee.isActive
      )
    ) {
      toast({ title: '同じ金額が登録されています', variant: 'destructive' })
      return
    }
    setBusy(true)
    const payload = {
      name: existing?.name ?? `${label} ${price.toLocaleString()}円`,
      kind,
      price,
      isTakeHomeBonus: true,
      storeShare: 0,
      castShare: 0,
      isActive: true,
      sortOrder: price,
    }
    try {
      const saved = existing
        ? await updateDesignationFee(existing.id, payload, storeId)
        : await createDesignationFee(payload, storeId)
      setFees((previous) => [...previous.filter((fee) => fee.id !== saved.id), saved])
      setDrafts((previous) => {
        const next = { ...previous }
        delete next[key]
        return next
      })
      toast({ title: '手取UPの金額を保存しました' })
    } catch (error) {
      console.error('Failed to save take-home rate:', error)
      toast({
        title: '金額を保存できませんでした',
        description: '入力内容を確認して、再度保存してください。',
        variant: 'destructive',
      })
    } finally {
      setBusy(false)
    }
  }

  const toggleActive = async (fee: DesignationFee) => {
    setBusy(true)
    try {
      const saved = await updateDesignationFee(fee.id, { isActive: !fee.isActive }, storeId)
      setFees((previous) => previous.map((item) => (item.id === saved.id ? saved : item)))
    } catch (error) {
      console.error('Failed to toggle take-home rate:', error)
      toast({ title: '状態を変更できませんでした', variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section id="take-home-bonuses" className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">キャスト手取UPの金額設定</h2>
        <p className="text-sm text-muted-foreground">
          追加支給額を種類ごとに登録し、キャストの基本情報編集で選択します。お客様への請求額は増えません。
        </p>
        <p className="text-xs text-muted-foreground">
          金額を変更すると、この金額を選択中のキャストの今後の計算に適用されます。停止した金額は選択・計算の対象外になります。
        </p>
      </div>
      {loading && <p>金額を読み込み中です...</p>}
      {loadError && (
        <p role="alert">金額を取得できませんでした。ページを再読み込みしてください。</p>
      )}
      <fieldset disabled={busy || loading || loadError} className="grid gap-3 md:grid-cols-2">
        {CATEGORIES.map(({ kind, label }) => (
          <Card key={kind}>
            <CardHeader className="p-3">
              <CardTitle className="text-base">{label}手取UP</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3 pt-0">
              {fees
                .filter((fee) => fee.kind === kind)
                .sort((a, b) => a.price - b.price)
                .map((fee) => (
                  <div key={fee.id} className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      aria-label={`${fee.name}の金額`}
                      value={drafts[fee.id] ?? String(fee.price)}
                      onChange={(event) =>
                        setDrafts((previous) => ({ ...previous, [fee.id]: event.target.value }))
                      }
                      className="h-8 w-28"
                    />
                    <span className="text-sm">円</span>
                    <Button
                      size="sm"
                      aria-label={`${fee.name}を保存`}
                      onClick={() => void persist(kind, label, fee)}
                    >
                      保存
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void toggleActive(fee)}>
                      {fee.isActive ? '停止' : '再開'}
                    </Button>
                    {!fee.isActive && <span className="text-xs">停止中</span>}
                  </div>
                ))}
              <div className="flex items-end gap-2">
                <div>
                  <Label htmlFor={`bonus-new-${kind}`}>{label}の追加金額</Label>
                  <Input
                    id={`bonus-new-${kind}`}
                    type="number"
                    min={1}
                    step={1}
                    placeholder="1000"
                    value={drafts[kind] ?? ''}
                    onChange={(event) =>
                      setDrafts((previous) => ({ ...previous, [kind]: event.target.value }))
                    }
                    className="h-8 w-28"
                  />
                </div>
                <span className="pb-1 text-sm">円</span>
                <Button
                  size="sm"
                  variant="outline"
                  aria-label={`${label}の金額を追加`}
                  onClick={() => void persist(kind, label)}
                >
                  追加
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </fieldset>
    </section>
  )
}

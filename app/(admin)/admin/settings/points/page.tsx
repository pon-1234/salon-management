'use client'

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { PointExpirationPanel } from '@/components/admin/point-expiration-panel'

export default function PointSettingsPage() {
  const [form, setForm] = useState({
    pointEarnRate: 1,
    pointExpirationMonths: 12,
    pointMinUsage: 100,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings/points', {
          credentials: 'include',
        })
        if (!response.ok) {
          throw new Error('設定の取得に失敗しました')
        }
        const payload = await response.json()
        setForm({
          pointEarnRate: payload.pointEarnRate ?? 1,
          pointExpirationMonths: payload.pointExpirationMonths ?? 12,
          pointMinUsage: payload.pointMinUsage ?? 100,
        })
      } catch (error) {
        toast({
          title: 'エラー',
          description: error instanceof Error ? error.message : '設定の取得に失敗しました',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [])

  const handleChange =
    (field: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({
        ...prev,
        [field]: Number(event.target.value),
      }))
    }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await fetch('/api/settings/points', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      if (!response.ok) {
        throw new Error('設定の保存に失敗しました')
      }

      toast({
        title: '保存しました',
        description: 'ポイント設定を更新しました。',
      })
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : '設定の保存に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>ポイント設定</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <div className="h-10 w-full animate-pulse rounded bg-gray-100" />
              <div className="h-10 w-full animate-pulse rounded bg-gray-100" />
              <div className="h-10 w-full animate-pulse rounded bg-gray-100" />
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <Label htmlFor="pointEarnRate">ポイント付与率（%）</Label>
                <Input
                  id="pointEarnRate"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={form.pointEarnRate}
                  onChange={handleChange('pointEarnRate')}
                />
              </div>
              <div>
                <Label htmlFor="pointExpirationMonths">有効期限（月）</Label>
                <Input
                  id="pointExpirationMonths"
                  type="number"
                  min={1}
                  max={36}
                  value={form.pointExpirationMonths}
                  onChange={handleChange('pointExpirationMonths')}
                />
              </div>
              <div>
                <Label htmlFor="pointMinUsage">最小利用ポイント</Label>
                <Input
                  id="pointMinUsage"
                  type="number"
                  min={0}
                  value={form.pointMinUsage}
                  onChange={handleChange('pointMinUsage')}
                />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <PointExpirationPanel />
    </div>
  )
}

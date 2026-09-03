'use client'

/**
 * @design_doc   Notion task #281 centralized sales and recruitment media management
 * @related_to   StoreSettings.mediaAccounts and reservation marketing channels
 * @known_issues Credentials are visible only to administrators with settings access
 */
import { useEffect, useState } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/admin/page-header'
import { useStore } from '@/contexts/store-context'
import { toast } from '@/hooks/use-toast'
import type { MediaAccountInput, MediaCategory } from '@/lib/settings/media-accounts'

const emptyAccount = (): MediaAccountInput => ({
  id: crypto.randomUUID(),
  name: '',
  category: 'sales',
  publicUrl: '',
  adminUrl: '',
  loginId: '',
  password: '',
})

export default function MediaInfoPage() {
  const { currentStore } = useStore()
  const [accounts, setAccounts] = useState<MediaAccountInput[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let ignore = false
    const load = async () => {
      const response = await fetch(
        `/api/settings/store?storeId=${encodeURIComponent(currentStore.id)}`,
        {
          credentials: 'include',
          cache: 'no-store',
        }
      )
      if (!response.ok) return
      const payload = await response.json()
      const settings = payload?.data ?? payload
      if (!ignore) setAccounts(Array.isArray(settings.mediaAccounts) ? settings.mediaAccounts : [])
    }
    void load()
    return () => {
      ignore = true
    }
  }, [currentStore.id])

  const updateAccount = (id: string, changes: Partial<MediaAccountInput>) => {
    setAccounts((current) =>
      current.map((account) => (account.id === id ? { ...account, ...changes } : account))
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(
        `/api/settings/store?storeId=${encodeURIComponent(currentStore.id)}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mediaAccounts: accounts }),
        }
      )
      if (!response.ok) throw new Error('媒体設定の保存に失敗しました')
      toast({ title: '媒体設定を保存しました' })
    } catch (error) {
      toast({
        title: '保存できませんでした',
        description: error instanceof Error ? error.message : '時間をおいて再度お試しください。',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader title="媒体・ログイン情報" />
        <p className="text-sm text-muted-foreground">
          営業媒体は予約経路の選択肢に自動追加されます。パスワードは暗号化して保存します。
        </p>
        <div className="space-y-4">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">
                  {account.category === 'sales' ? '営業媒体' : '求人媒体'}
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`${account.name || '媒体'}を削除`}
                  onClick={() =>
                    setAccounts((current) => current.filter(({ id }) => id !== account.id))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>種別</Label>
                  <Select
                    value={account.category}
                    onValueChange={(category: MediaCategory) =>
                      updateAccount(account.id, { category })
                    }
                  >
                    <SelectTrigger aria-label="媒体種別">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">営業媒体</SelectItem>
                      <SelectItem value="recruitment">求人媒体</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`media-name-${account.id}`}>媒体名</Label>
                  <Input
                    id={`media-name-${account.id}`}
                    value={account.name}
                    onChange={(event) => updateAccount(account.id, { name: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`media-public-${account.id}`}>公開ページURL</Label>
                  <Input
                    id={`media-public-${account.id}`}
                    type="url"
                    value={account.publicUrl}
                    onChange={(event) =>
                      updateAccount(account.id, { publicUrl: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`media-admin-${account.id}`}>管理画面URL</Label>
                  <Input
                    id={`media-admin-${account.id}`}
                    type="url"
                    value={account.adminUrl}
                    onChange={(event) =>
                      updateAccount(account.id, { adminUrl: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`media-login-${account.id}`}>ログインID</Label>
                  <Input
                    id={`media-login-${account.id}`}
                    autoComplete="off"
                    value={account.loginId}
                    onChange={(event) => updateAccount(account.id, { loginId: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`media-password-${account.id}`}>パスワード</Label>
                  <Input
                    id={`media-password-${account.id}`}
                    type="password"
                    autoComplete="new-password"
                    value={account.password}
                    onChange={(event) =>
                      updateAccount(account.id, { password: event.target.value })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="sticky bottom-0 flex justify-between border-t bg-background py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setAccounts((current) => [...current, emptyAccount()])}
          >
            <Plus className="mr-2 h-4 w-4" />
            媒体を追加
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </div>
  )
}

'use client'

/**
 * @design_doc   Notion task #281 centralized sales and recruitment media management
 * @related_to   StoreSettings.mediaAccounts and reservation marketing channels
 * @known_issues Credentials are visible only to administrators with settings access
 */
import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, ExternalLink, Plus, Save, Trash2 } from 'lucide-react'
import Link from 'next/link'
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
import {
  moveMediaAccount,
  type MediaAccountInput,
  type MediaCategory,
} from '@/lib/settings/media-catalog'

const CATEGORY_LABELS: Record<MediaCategory, string> = {
  sales: '営業媒体',
  recruitment: '求人媒体',
  store: 'その他・店舗関連',
}

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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [saving, setSaving] = useState(false)
  const [loadedStoreId, setLoadedStoreId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState('')
  const canSave = loadedStoreId === currentStore.id && !saving

  useEffect(() => {
    let ignore = false
    setLoadedStoreId(null)
    setAccounts([])
    setEditingId(null)
    setLoadError('')
    const load = async () => {
      try {
        const response = await fetch(
          `/api/settings/store?storeId=${encodeURIComponent(currentStore.id)}`,
          {
            credentials: 'include',
            cache: 'no-store',
          }
        )
        if (!response.ok)
          throw new Error('媒体設定を読み込めませんでした。再読み込みしてください。')
        const payload = await response.json()
        const settings = payload?.data ?? payload
        if (!ignore) {
          setAccounts(Array.isArray(settings.mediaAccounts) ? settings.mediaAccounts : [])
          setLoadedStoreId(currentStore.id)
        }
      } catch (error) {
        if (!ignore)
          setLoadError(
            error instanceof Error
              ? error.message
              : '媒体設定を読み込めませんでした。再読み込みしてください。'
          )
      }
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
    if (!canSave) return
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
        <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b bg-background/95 py-3 backdrop-blur">
          <PageHeader title="ログイン・編集" />
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/admin/media">
                <ExternalLink className="mr-2 h-4 w-4" />
                閲覧画面
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!canSave}
              onClick={() => {
                const account = emptyAccount()
                setAccounts((current) => [...current, account])
                setEditingId(account.id)
                setQuery('')
                setCategoryFilter('all')
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              媒体を追加
            </Button>
            <Button type="button" onClick={handleSave} disabled={!canSave}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          営業媒体は予約経路の選択肢に自動追加されます。パスワードは暗号化して保存します。
        </p>
        {loadError ? (
          <p role="alert" className="text-sm text-destructive">
            {loadError}
          </p>
        ) : null}
        <div className="flex gap-3">
          <Input
            aria-label="媒体を検索"
            placeholder="媒体名で検索"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            aria-label="媒体区分"
            className="rounded border bg-background px-3"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="all">全区分</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          {accounts
            .filter(
              (account) =>
                account.name.includes(query) &&
                (categoryFilter === 'all' || account.category === categoryFilter)
            )
            .map((account) => (
              <Card key={account.id}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-sm">
                      {account.name || '新しい媒体'}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {CATEGORY_LABELS[account.category]}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {account.publicUrl ? (
                      <a
                        href={account.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 text-xs text-emerald-700"
                      >
                        サイト
                      </a>
                    ) : null}
                    {account.adminUrl ? (
                      <a
                        href={account.adminUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 text-xs text-emerald-700"
                      >
                        ログイン
                      </a>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      aria-label={`${account.name || '媒体'}を編集する`}
                      onClick={() => setEditingId(editingId === account.id ? null : account.id)}
                    >
                      {editingId === account.id ? '閉じる' : '編集する'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`${account.name || '媒体'}を上へ`}
                      onClick={() =>
                        setAccounts((current) => moveMediaAccount(current, account.id, -1))
                      }
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`${account.name || '媒体'}を下へ`}
                      onClick={() =>
                        setAccounts((current) => moveMediaAccount(current, account.id, 1))
                      }
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
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
                  </div>
                </CardHeader>
                {editingId === account.id ? (
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
                          <SelectItem value="store">その他・店舗関連</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`media-name-${account.id}`}>媒体名</Label>
                      <Input
                        id={`media-name-${account.id}`}
                        value={account.name}
                        onChange={(event) =>
                          updateAccount(account.id, { name: event.target.value })
                        }
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
                        onChange={(event) =>
                          updateAccount(account.id, { loginId: event.target.value })
                        }
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
                ) : null}
              </Card>
            ))}
        </div>
      </div>
    </div>
  )
}

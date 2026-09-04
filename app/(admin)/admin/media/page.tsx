'use client'

/**
 * @design_doc   Notion task #281 read-only media operations page
 * @related_to   MediaInfoPage owns editing; StoreSettings.mediaAccounts persists the catalog
 * @known_issues Login passwords remain available only on the settings edit page
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Settings } from 'lucide-react'
import { PageHeader } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/contexts/store-context'
import type { MediaAccountInput, MediaCategory } from '@/lib/settings/media-catalog'

const SECTIONS: Array<{ category: MediaCategory; label: string }> = [
  { category: 'sales', label: '営業媒体' },
  { category: 'recruitment', label: '求人媒体' },
  { category: 'store', label: 'その他・店舗関連' },
]

export default function MediaPage() {
  const { currentStore } = useStore()
  const [accounts, setAccounts] = useState<MediaAccountInput[]>([])

  useEffect(() => {
    let ignore = false
    void fetch(`/api/settings/store?storeId=${encodeURIComponent(currentStore.id)}`, {
      credentials: 'include',
      cache: 'no-store',
    })
      .then((response) =>
        response.ok ? response.json() : Promise.reject(new Error('load failed'))
      )
      .then((payload) => {
        const settings = payload?.data ?? payload
        if (!ignore)
          setAccounts(Array.isArray(settings.mediaAccounts) ? settings.mediaAccounts : [])
      })
      .catch((error) => console.error('Failed to load media accounts:', error))
    return () => {
      ignore = true
    }
  }, [currentStore.id])

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <PageHeader title="媒体一覧" />
          <Button variant="outline" asChild>
            <Link href="/admin/settings/media-info">
              <Settings className="mr-2 h-4 w-4" />
              媒体を編集
            </Link>
          </Button>
        </div>
        <div className="grid gap-6 xl:grid-cols-3">
          {SECTIONS.map(({ category, label }) => {
            const sectionAccounts = accounts.filter((account) => account.category === category)
            return (
              <section key={category} aria-labelledby={`media-${category}`} className="space-y-3">
                <h2 id={`media-${category}`} className="text-lg font-semibold">
                  {label}
                </h2>
                {sectionAccounts.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-sm text-muted-foreground">
                      登録はありません
                    </CardContent>
                  </Card>
                ) : (
                  sectionAccounts.map((account) => (
                    <Card key={account.id}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{account.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        {account.loginId ? (
                          <div>
                            <Badge variant="outline">ID</Badge>{' '}
                            <span className="ml-2 break-all">{account.loginId}</span>
                          </div>
                        ) : null}
                        <div className="flex flex-wrap gap-2">
                          {account.publicUrl ? (
                            <Button size="sm" variant="outline" asChild>
                              <a href={account.publicUrl} target="_blank" rel="noreferrer">
                                <ExternalLink className="mr-1 h-3 w-3" />
                                公開ページを開く
                              </a>
                            </Button>
                          ) : null}
                          {account.adminUrl ? (
                            <Button size="sm" asChild>
                              <a href={account.adminUrl} target="_blank" rel="noreferrer">
                                <ExternalLink className="mr-1 h-3 w-3" />
                                管理画面を開く
                              </a>
                            </Button>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}

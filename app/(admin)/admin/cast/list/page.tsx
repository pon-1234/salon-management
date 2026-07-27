'use client'

/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md K-2, K-3
 * @related_to   CastRepositoryImpl: bounded lightweight cast list requests
 * @known_issues Filters apply to the current page
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { CastListView } from '@/components/cast/cast-list-view'
import { Cast } from '@/lib/cast/types'
import { CastRepositoryImpl } from '@/lib/cast/repository-impl'
import { toast } from '@/hooks/use-toast'
import { CastListActionButtons } from '@/components/cast/cast-list-action-buttons'
import { CastListViewToggle } from '@/components/cast/cast-list-view-toggle'
import { CastListInfoBar } from '@/components/cast/cast-list-info-bar'
import { useStore } from '@/contexts/store-context'
import { Button } from '@/components/ui/button'
import { TableSkeleton } from '@/components/ui/page-loading'

const PAGE_SIZE = 25

export default function CastListPage() {
  const { currentStore } = useStore()
  const [castList, setCastList] = useState<Cast[]>([])
  const [allCasts, setAllCasts] = useState<Cast[]>([])
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [workStatus, setWorkStatus] = useState('就業中(公開)')
  const [nameSearch, setNameSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const castRepository = useMemo(
    () => new CastRepositoryImpl(undefined, currentStore.id),
    [currentStore.id]
  )

  useEffect(() => {
    // ページ遷移時にスクロール位置をリセット
    window.scrollTo(0, 0)
  }, [])

  const fetchCasts = useCallback(async () => {
    setLoading(true)
    try {
      const offset = page * PAGE_SIZE
      const casts = await castRepository.getAll({ limit: PAGE_SIZE + 1, offset })
      setHasMore(casts.length > PAGE_SIZE)
      const pageCasts = casts.slice(0, PAGE_SIZE)
      setAllCasts(pageCasts)
      setCastList(pageCasts)
    } catch (error) {
      console.error('Error fetching casts:', error)
      toast({
        title: 'エラー',
        description: 'キャスト一覧の取得に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [castRepository, page])

  useEffect(() => {
    fetchCasts()
  }, [fetchCasts])

  const filteredCasts = castList.filter((cast) => {
    const matchesName =
      cast.name.toLowerCase().includes(nameSearch.toLowerCase()) ||
      cast.nameKana.toLowerCase().includes(nameSearch.toLowerCase())
    return matchesName
  })

  const handleRefresh = () => {
    fetchCasts()
  }

  const handleFilterCharacter = (char: string) => {
    if (char === '全') {
      setCastList(allCasts)
      return
    }

    const aRow = ['あ', 'い', 'う', 'え', 'お']
    const kaRow = ['か', 'き', 'く', 'け', 'こ']
    const saRow = ['さ', 'し', 'す', 'せ', 'そ']
    const taRow = ['た', 'ち', 'つ', 'て', 'と']
    const naRow = ['な', 'に', 'ぬ', 'ね', 'の']
    const haRow = ['は', 'ひ', 'ふ', 'へ', 'ほ']
    const maRow = ['ま', 'み', 'む', 'め', 'も']
    const yaRow = ['や', 'ゆ', 'よ']
    const raRow = ['ら', 'り', 'る', 'れ', 'ろ']
    const waRow = ['わ', 'を', 'ん']

    const rowMap: Record<string, string[]> = {
      あ: aRow,
      か: kaRow,
      さ: saRow,
      た: taRow,
      な: naRow,
      は: haRow,
      ま: maRow,
      や: yaRow,
      ら: raRow,
      わ: waRow,
    }

    if (char === 'その他') {
      const filtered = allCasts.filter((cast) => {
        const firstChar = cast.nameKana.charAt(0)
        const isOther = !Object.values(rowMap).some((row) => row.includes(firstChar))
        return isOther
      })
      setCastList(filtered)
      return
    }

    const targetRow = rowMap[char] || []
    const filtered = allCasts.filter((cast) => {
      const firstChar = cast.nameKana.charAt(0)
      return targetRow.includes(firstChar)
    })
    setCastList(filtered)
  }

  const handleFilter = () => {
    // Filter logic can be implemented here
  }

  return (
    <div className="min-h-screen bg-white">
      <CastListInfoBar />
      <CastListViewToggle view={view} onViewChange={setView} />
      <CastListActionButtons
        onRefresh={handleRefresh}
        onFilterCharacter={handleFilterCharacter}
        onFilter={handleFilter}
        nameSearch={nameSearch}
        onNameSearchChange={setNameSearch}
        workStatus={workStatus}
        onWorkStatusChange={setWorkStatus}
      />

      <main className="p-4">
        {loading ? (
          <TableSkeleton rows={6} columns={4} label="キャスト一覧を読み込んでいます" />
        ) : (
          <>
            <CastListView casts={filteredCasts} view={view} />
            <div className="mt-4 flex items-center justify-end gap-3">
              <Button variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>
                前へ
              </Button>
              <span className="text-sm text-muted-foreground">{page + 1}ページ</span>
              <Button variant="outline" disabled={!hasMore} onClick={() => setPage(page + 1)}>
                次へ
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

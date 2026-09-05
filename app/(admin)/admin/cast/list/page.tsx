'use client'

/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md K-2, K-3
 * @related_to   CastRepositoryImpl: loads the complete store-scoped cast list
 * @known_issues None currently
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { CastListView } from '@/components/cast/cast-list-view'
import { Cast } from '@/lib/cast/types'
import { CastRepositoryImpl } from '@/lib/cast/repository-impl'
import { toast } from '@/hooks/use-toast'
import { CastListActionButtons } from '@/components/cast/cast-list-action-buttons'
import { CastListViewToggle } from '@/components/cast/cast-list-view-toggle'
import { useStore } from '@/contexts/store-context'
import { TableSkeleton } from '@/components/ui/page-loading'
import { sortCastsByGojuon } from '@/lib/cast/gojuon-sort'
import { matchesCastNameSearch } from '@/lib/cast/name-search'

const KANA_ROWS: Record<string, string[]> = {
  あ: ['あ', 'い', 'う', 'え', 'お'],
  か: ['か', 'き', 'く', 'け', 'こ'],
  さ: ['さ', 'し', 'す', 'せ', 'そ'],
  た: ['た', 'ち', 'つ', 'て', 'と'],
  な: ['な', 'に', 'ぬ', 'ね', 'の'],
  は: ['は', 'ひ', 'ふ', 'へ', 'ほ'],
  ま: ['ま', 'み', 'む', 'め', 'も'],
  や: ['や', 'ゆ', 'よ'],
  ら: ['ら', 'り', 'る', 'れ', 'ろ'],
  わ: ['わ', 'を', 'ん'],
}

function normalizeKana(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u3099\u309a]/g, '')
    .replace(/[ァ-ヶ]/g, (character) => String.fromCharCode(character.charCodeAt(0) - 0x60))
    .replace(
      /[ぁぃぅぇぉ]/g,
      (character) => ({ ぁ: 'あ', ぃ: 'い', ぅ: 'う', ぇ: 'え', ぉ: 'お' })[character] ?? character
    )
    .replace(/[ゃゅょ]/g, (character) => ({ ゃ: 'や', ゅ: 'ゆ', ょ: 'よ' })[character] ?? character)
}

function matchesKanaFilter(nameKana: string, kanaFilter: string): boolean {
  if (kanaFilter === '全') {
    return true
  }

  const firstCharacter = normalizeKana(nameKana.trim()).charAt(0)
  const knownCharacters = Object.values(KANA_ROWS).flat()
  if (kanaFilter === 'その他') {
    return firstCharacter.length > 0 && !knownCharacters.includes(firstCharacter)
  }

  return (KANA_ROWS[kanaFilter] ?? []).includes(firstCharacter)
}

export default function CastListPage() {
  const { currentStore } = useStore()
  const [allCasts, setAllCasts] = useState<Cast[]>([])
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [employmentStatus, setEmploymentStatus] = useState('active')
  const [kanaFilter, setKanaFilter] = useState('全')
  const [nameSearch, setNameSearch] = useState('')
  const [loading, setLoading] = useState(true)
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
      const pageSize = 100
      let offset = 0
      const casts: Cast[] = []
      let page: Cast[]

      do {
        page = await castRepository.getAll({ limit: 100, offset })
        casts.push(...page)
        offset += page.length
      } while (page.length === pageSize)

      setAllCasts(casts)
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
  }, [castRepository])

  useEffect(() => {
    fetchCasts()
  }, [fetchCasts])

  const filteredCasts = sortCastsByGojuon(
    allCasts.filter((cast) => {
      const matchesName = matchesCastNameSearch(cast, nameSearch)
      const matchesWorkStatus = cast.employmentStatus === employmentStatus

      return matchesName && matchesWorkStatus && matchesKanaFilter(cast.nameKana, kanaFilter)
    })
  )

  const handleRefresh = () => {
    fetchCasts()
  }

  const handleFilterCharacter = (char: string) => {
    setKanaFilter(char)
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-20 bg-white shadow-sm">
        <CastListActionButtons
          viewToggle={<CastListViewToggle view={view} onViewChange={setView} />}
          onRefresh={handleRefresh}
          onFilterCharacter={handleFilterCharacter}
          nameSearch={nameSearch}
          onNameSearchChange={setNameSearch}
          employmentStatus={employmentStatus}
          onEmploymentStatusChange={setEmploymentStatus}
        />
      </div>

      <main className="p-2">
        {loading ? (
          <TableSkeleton rows={6} columns={4} label="キャスト一覧を読み込んでいます" />
        ) : (
          <CastListView casts={filteredCasts} view={view} />
        )}
      </main>
    </div>
  )
}

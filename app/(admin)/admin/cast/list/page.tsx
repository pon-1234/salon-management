'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/header'
import { CastListView } from '@/components/cast/cast-list-view'
import { Cast } from '@/lib/cast/types'
import { CastRepositoryImpl } from '@/lib/cast/repository-impl'
import { toast } from '@/hooks/use-toast'
import { CastListActionButtons } from '@/components/cast/cast-list-action-buttons'
import { CastListViewToggle } from '@/components/cast/cast-list-view-toggle'
import { CastListInfoBar } from '@/components/cast/cast-list-info-bar'

export default function CastListPage() {
  const [castList, setCastList] = useState<Cast[]>([])
  const [allCasts, setAllCasts] = useState<Cast[]>([])
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [workStatus, setWorkStatus] = useState('就業中(公開)')
  const [nameSearch, setNameSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const castRepository = new CastRepositoryImpl()

  useEffect(() => {
    // ページ遷移時にスクロール位置をリセット
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    fetchCasts()
  }, [])

  const fetchCasts = async () => {
    setLoading(true)
    try {
      const casts = await castRepository.getAll()
      setAllCasts(casts)
      setCastList(casts)
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
  }

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
      <Header />
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
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : (
          <CastListView casts={filteredCasts} view={view} />
        )}
      </main>
    </div>
  )
}

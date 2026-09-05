/**
 * @design_doc   Client operational review: cast list controls filter persisted cast attributes
 * @related_to   CastListPage, CastListView
 * @known_issues None currently
 */
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, PlusCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'

interface CastListActionButtonsProps {
  viewToggle?: ReactNode
  onRefresh: () => void
  onFilterCharacter: (char: string) => void
  nameSearch: string
  onNameSearchChange: (value: string) => void
  employmentStatus: string
  onEmploymentStatusChange: (value: string) => void
}

export function CastListActionButtons({
  viewToggle,
  onRefresh,
  onFilterCharacter,
  nameSearch,
  onNameSearchChange,
  employmentStatus,
  onEmploymentStatusChange,
}: CastListActionButtonsProps) {
  const characters = ['全', 'あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ', 'その他']

  return (
    <div className="flex flex-wrap items-center gap-2 border-b p-2">
      {viewToggle}
      <div className="flex items-center gap-2">
        <Button onClick={onRefresh} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          更新
        </Button>
        <Link href="/admin/cast/manage/new">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
            <PlusCircle className="mr-2 h-4 w-4" />
            新規キャスト追加
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={employmentStatus} onValueChange={onEmploymentStatusChange}>
          <SelectTrigger className="h-8 w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="provisional">仮登録</SelectItem>
            <SelectItem value="active">在籍</SelectItem>
            <SelectItem value="retired">退店</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="search"
          placeholder="名前・ひらがなで検索"
          aria-label="キャスト名・ひらがな検索"
          value={nameSearch}
          onChange={(e) => onNameSearchChange(e.target.value)}
          className="h-8 w-[200px]"
        />
      </div>

      <div className="flex basis-full flex-wrap gap-1">
        {characters.map((char) => (
          <Button
            key={char}
            variant="outline"
            size="sm"
            onClick={() => onFilterCharacter(char)}
            className="h-7 px-2 text-xs"
          >
            {char}
          </Button>
        ))}
      </div>
    </div>
  )
}

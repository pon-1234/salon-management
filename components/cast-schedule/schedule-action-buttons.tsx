import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  RefreshCw,
  Filter,
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  Grid,
  List,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { format, addWeeks, subWeeks } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useState } from 'react'

interface ScheduleActionButtonsProps {
  onRefresh: () => void
  onFilter: () => void
  onFilterCharacter: () => void
  date: Date
  onDateChange: (date: Date) => void
}

export function ScheduleActionButtons({
  onRefresh,
  onFilter,
  onFilterCharacter,
  date,
  onDateChange,
}: ScheduleActionButtonsProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedCharacterFilter, setSelectedCharacterFilter] = useState<string>('全')

  const characters = ['全', 'あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ', 'その他']

  const handlePrevWeek = () => {
    onDateChange(subWeeks(date, 1))
  }

  const handleNextWeek = () => {
    onDateChange(addWeeks(date, 1))
  }

  const handleCharacterFilter = (char: string) => {
    setSelectedCharacterFilter(char)
    onFilterCharacter()
  }

  return (
    <div className="border-b bg-white">
      <div className="mx-auto max-w-7xl p-4">
        {/* Main Controls */}
        <div className="mb-4 flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
          {/* Left side - Week Navigation & Search */}
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-1">
              <Button variant="ghost" size="sm" onClick={handlePrevWeek} className="h-8 w-8 p-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[140px] px-3 py-1 text-center text-sm font-medium text-gray-700">
                {format(date, 'yyyy年M月d日週', { locale: ja })}
              </div>
              <Button variant="ghost" size="sm" onClick={handleNextWeek} className="h-8 w-8 p-0">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                placeholder="キャスト名で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-[200px] pl-9"
              />
            </div>
          </div>

          {/* Right side - View Controls & Actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-7 px-2"
              >
                <Grid className="h-3 w-3" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-7 px-2"
              >
                <List className="h-3 w-3" />
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  フィルター
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>表示設定</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>出勤予定のみ</DropdownMenuItem>
                <DropdownMenuItem>休日のみ</DropdownMenuItem>
                <DropdownMenuItem>未入力のみ</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>VIPキャスト</DropdownMenuItem>
                <DropdownMenuItem>新人キャスト</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={onRefresh} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              更新
            </Button>
          </div>
        </div>

        {/* Character Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {characters.map((char) => (
            <Button
              key={char}
              variant={selectedCharacterFilter === char ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleCharacterFilter(char)}
              className={`h-8 px-3 text-xs ${
                selectedCharacterFilter === char
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700'
              }`}
            >
              {char}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}

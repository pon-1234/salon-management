/**
 * @design_doc   Multi-store weekly cast schedule administration
 * @related_to   WeeklySchedulePage owns the controlled filter and presentation state
 * @known_issues None
 */
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RefreshCw, Filter, Search, ChevronLeft, ChevronRight, Grid, List } from 'lucide-react'
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
import { addWeeks, addMonths, subWeeks } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { ja } from 'date-fns/locale'

export type ScheduleStatusFilter = 'all' | 'working' | 'holiday' | 'unset'
export type ScheduleCharacterFilter =
  | '全'
  | 'あ'
  | 'か'
  | 'さ'
  | 'た'
  | 'な'
  | 'は'
  | 'ま'
  | 'や'
  | 'ら'
  | 'わ'
  | 'その他'
export type ScheduleViewMode = 'grid' | 'list'

export interface ScheduleStoreOption {
  id: string
  displayName: string
}

interface ScheduleActionButtonsProps {
  onRefresh: () => void
  date: Date
  onDateChange: (date: Date) => void
  stores: ScheduleStoreOption[]
  selectedStoreId: string
  onStoreChange: (storeId: string) => void
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  statusFilter: ScheduleStatusFilter
  onStatusFilterChange: (filter: ScheduleStatusFilter) => void
  characterFilter: ScheduleCharacterFilter
  onCharacterFilterChange: (filter: ScheduleCharacterFilter) => void
  viewMode: ScheduleViewMode
  onViewModeChange: (mode: ScheduleViewMode) => void
}

const CHARACTERS: ScheduleCharacterFilter[] = [
  '全',
  'あ',
  'か',
  'さ',
  'た',
  'な',
  'は',
  'ま',
  'や',
  'ら',
  'わ',
  'その他',
]

const STATUS_FILTER_LABELS: Record<ScheduleStatusFilter, string> = {
  all: 'すべて',
  working: '出勤予定のみ',
  holiday: '休日のみ',
  unset: '未入力のみ',
}

function characterAccessibleName(character: ScheduleCharacterFilter): string {
  if (character === '全') return '全て'
  if (character === 'その他') return character
  return `${character}行`
}

export function ScheduleActionButtons({
  onRefresh,
  date,
  onDateChange,
  stores,
  selectedStoreId,
  onStoreChange,
  searchQuery,
  onSearchQueryChange,
  statusFilter,
  onStatusFilterChange,
  characterFilter,
  onCharacterFilterChange,
  viewMode,
  onViewModeChange,
}: ScheduleActionButtonsProps) {
  const timeZone = 'Asia/Tokyo'

  return (
    <div className="border-b bg-white">
      <div className="px-3 py-2">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedStoreId} onValueChange={onStoreChange}>
              <SelectTrigger aria-label="店舗" className="h-9 w-[160px]">
                <SelectValue placeholder="店舗を選択" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-gray-50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDateChange(subWeeks(date, 1))}
                className="h-8 w-8 p-0"
                aria-label="前の週"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[140px] px-3 py-1 text-center text-sm font-medium text-gray-700">
                {formatInTimeZone(date, timeZone, 'yyyy年M月d日開始週', { locale: ja })}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDateChange(addWeeks(date, 1))}
                className="h-8 w-8 p-0"
                aria-label="次の週"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={() => onDateChange(new Date())}
              >
                今日
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={() => onDateChange(addMonths(date, -1))}
              >
                前の月
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={() => onDateChange(addMonths(date, 1))}
              >
                次の月
              </Button>
              <input
                type="date"
                aria-label="出勤表の日付へ移動"
                className="h-8 w-36 rounded-md border border-input bg-background px-2 text-sm"
                value={formatInTimeZone(date, timeZone, 'yyyy-MM-dd')}
                onChange={(event) => {
                  if (!event.target.value) return
                  onDateChange(new Date(`${event.target.value}T00:00:00`))
                }}
              />
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                type="search"
                aria-label="キャスト名検索"
                placeholder="キャスト名・読み仮名で検索..."
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                className="h-8 w-[190px] pl-9"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('grid')}
                className="h-7 px-2"
                aria-label="表表示"
                aria-pressed={viewMode === 'grid'}
              >
                <Grid className="h-3 w-3" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('list')}
                className="h-7 px-2"
                aria-label="一覧表示"
                aria-pressed={viewMode === 'list'}
              >
                <List className="h-3 w-3" />
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`ステータスフィルター: ${STATUS_FILTER_LABELS[statusFilter]}`}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  {STATUS_FILTER_LABELS[statusFilter]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>勤務ステータス</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.entries(STATUS_FILTER_LABELS) as [ScheduleStatusFilter, string][]).map(
                  ([filter, label]) => (
                    <DropdownMenuItem
                      key={filter}
                      onSelect={() => onStatusFilterChange(filter)}
                      aria-current={statusFilter === filter ? 'true' : undefined}
                    >
                      {label}
                    </DropdownMenuItem>
                  )
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={onRefresh} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              更新
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1" aria-label="五十音フィルター">
          {CHARACTERS.map((character) => (
            <Button
              key={character}
              variant={characterFilter === character ? 'default' : 'outline'}
              size="sm"
              onClick={() => onCharacterFilterChange(character)}
              className={`h-7 px-2 text-xs ${
                characterFilter === character
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700'
              }`}
              aria-label={characterAccessibleName(character)}
              aria-pressed={characterFilter === character}
            >
              {character}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}

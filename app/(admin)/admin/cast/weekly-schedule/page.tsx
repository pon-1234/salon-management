'use client'

/**
 * @design_doc   Multi-store weekly cast schedule administration
 * @related_to   CastScheduleUseCases, ScheduleActionButtons, and ScheduleGrid
 * @known_issues None
 */
import React, { useEffect, useMemo, useState } from 'react'
import { ScheduleGrid } from '@/components/cast-schedule/schedule-grid'
import { CastScheduleUseCases } from '@/lib/cast-schedule/usecases'
import type { CastScheduleEntry, WeeklySchedule } from '@/lib/cast-schedule/old-types'
import { ScheduleInfoBar } from '@/components/cast-schedule/schedule-info-bar'
import {
  ScheduleActionButtons,
  type ScheduleCharacterFilter,
  type ScheduleStatusFilter,
  type ScheduleViewMode,
} from '@/components/cast-schedule/schedule-action-buttons'
import type { WeeklyScheduleEdit } from '@/components/cast-schedule/schedule-edit-dialog'
import { toast } from '@/hooks/use-toast'
import { useStore } from '@/contexts/store-context'
import { buildStoreScopedEndpoint } from '@/lib/store/endpoints'
import { formatScheduleDate, getWeekDates } from '@/lib/cast-schedule/utils'
import { buildScheduleBatchPayload } from '@/lib/cast-schedule/batch-payload'

const castScheduleUseCases = new CastScheduleUseCases()

const KANA_GROUPS: Record<Exclude<ScheduleCharacterFilter, '全' | 'その他'>, string> = {
  あ: 'ぁあぃいぅうぇえぉおゔ',
  か: 'かがきぎくぐけげこご',
  さ: 'さざしじすずせぜそぞ',
  た: 'ただちぢっつづてでとど',
  な: 'なにぬねの',
  は: 'はばぱひびぴふぶぷへべぺほぼぽ',
  ま: 'まみむめも',
  や: 'ゃやゅゆょよ',
  ら: 'らりるれろ',
  わ: 'ゎわゐゑをん',
}

function katakanaToHiragana(value: string): string {
  return value.replace(/[ァ-ヶ]/g, (character) =>
    String.fromCharCode(character.charCodeAt(0) - 0x60)
  )
}

function normalizeSearchValue(value: string): string {
  return katakanaToHiragana(value.normalize('NFKC').toLocaleLowerCase('ja-JP')).replace(/\s+/g, '')
}

function matchesCharacterFilter(
  entry: CastScheduleEntry,
  characterFilter: ScheduleCharacterFilter
): boolean {
  if (characterFilter === '全') return true

  const firstCharacter = normalizeSearchValue(entry.nameKana || entry.name).charAt(0)
  const matchesKnownGroup = Object.values(KANA_GROUPS).some((group) =>
    group.includes(firstCharacter)
  )

  if (characterFilter === 'その他') return !matchesKnownGroup
  return KANA_GROUPS[characterFilter].includes(firstCharacter)
}

function matchesStatusFilter(
  entry: CastScheduleEntry,
  statusFilter: ScheduleStatusFilter,
  weekDateKeys: string[]
): boolean {
  if (statusFilter === 'all') return true

  const weekStatuses = weekDateKeys.map((dateKey) => entry.schedule[dateKey])
  if (statusFilter === 'working') {
    return weekStatuses.some((status) => status?.type === '出勤予定')
  }
  if (statusFilter === 'holiday') {
    return weekStatuses.length > 0 && weekStatuses.every((status) => status?.type === '休日')
  }
  return weekStatuses.some((status) => !status || status.type === '未入力')
}

export default function WeeklySchedulePage() {
  const { currentStore, availableStores, switchStore } = useStore()
  const [date, setDate] = useState(() => new Date())
  const [schedule, setSchedule] = useState<WeeklySchedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ScheduleStatusFilter>('all')
  const [characterFilter, setCharacterFilter] = useState<ScheduleCharacterFilter>('全')
  const [viewMode, setViewMode] = useState<ScheduleViewMode>('grid')

  useEffect(() => {
    let active = true

    const fetchSchedule = async () => {
      setLoading(true)
      try {
        const weeklySchedule = await castScheduleUseCases.getWeeklySchedule({
          date,
          castFilter: 'all',
          storeId: currentStore.id,
        })
        if (active) setSchedule(weeklySchedule)
      } catch (error) {
        console.error('Failed to fetch schedule:', error)
        if (active) {
          toast({
            title: 'エラー',
            description: 'スケジュールの取得に失敗しました',
            variant: 'destructive',
          })
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void fetchSchedule()
    return () => {
      active = false
    }
  }, [currentStore.id, date])

  const filteredEntries = useMemo(() => {
    if (!schedule) return []

    const normalizedQuery = normalizeSearchValue(searchQuery)
    const weekDateKeys = getWeekDates(schedule.startDate).map(formatScheduleDate)

    return schedule.entries.filter((entry) => {
      const searchableValue = normalizeSearchValue(`${entry.name}${entry.nameKana}`)
      const matchesSearch = !normalizedQuery || searchableValue.includes(normalizedQuery)

      return (
        matchesSearch &&
        matchesCharacterFilter(entry, characterFilter) &&
        matchesStatusFilter(entry, statusFilter, weekDateKeys)
      )
    })
  }, [characterFilter, schedule, searchQuery, statusFilter])

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const weeklySchedule = await castScheduleUseCases.getWeeklySchedule({
        date,
        castFilter: 'all',
        storeId: currentStore.id,
      })
      setSchedule(weeklySchedule)
      toast({
        title: '成功',
        description: 'スケジュールを更新しました',
      })
    } catch (error) {
      console.error('Failed to fetch schedule:', error)
      toast({
        title: 'エラー',
        description: 'スケジュールの更新に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSchedule = async (castId: string, editedSchedule: WeeklyScheduleEdit) => {
    try {
      const schedules = buildScheduleBatchPayload(editedSchedule, { includeUnset: true })

      const response = await fetch(
        buildStoreScopedEndpoint('/api/cast-schedule/batch', currentStore.id),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ castId, schedules }),
        }
      )
      const result = (await response.json()) as { error?: string; message?: string }

      if (!response.ok) {
        throw new Error(result.error || 'スケジュールの保存に失敗しました')
      }

      toast({
        title: '成功',
        description: result.message || 'スケジュールを保存しました',
      })
      setSchedule((previousSchedule) => {
        if (!previousSchedule) return previousSchedule

        const optimisticSchedule: CastScheduleEntry['schedule'] = Object.fromEntries(
          Object.entries(editedSchedule).map(([dateKey, daySchedule]) => [
            dateKey,
            {
              type: daySchedule.status,
              startTime: daySchedule.startTime,
              endTime: daySchedule.endTime,
              note: daySchedule.note,
              mediaText: daySchedule.mediaText,
              isAvailable: daySchedule.isAvailable,
            },
          ])
        )

        return {
          ...previousSchedule,
          entries: previousSchedule.entries.map((entry) =>
            entry.castId === castId
              ? { ...entry, schedule: { ...entry.schedule, ...optimisticSchedule } }
              : entry
          ),
        }
      })
      try {
        const refreshed = await castScheduleUseCases.getWeeklySchedule({
          date,
          castFilter: 'all',
          storeId: currentStore.id,
        })
        setSchedule(refreshed)
      } catch (error) {
        console.error('Schedule saved but totals refresh failed:', error)
        toast({
          title: '保存済みです',
          description: '集計の再取得に失敗しました。出勤表の更新ボタンで再読み込みできます。',
        })
      }
    } catch (error) {
      console.error('Failed to save schedule:', error)
      throw error
    }
  }

  if (loading || !schedule) {
    return (
      <div data-testid="weekly-schedule-page" className="flex h-full min-h-0 flex-col bg-gray-50">
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600" />
            <p className="text-gray-600">読み込み中...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      data-testid="weekly-schedule-page"
      className="flex h-full min-h-0 flex-col overflow-hidden bg-gray-50"
    >
      <div className="shrink-0">
        <ScheduleInfoBar
          totalCast={schedule.stats.totalCast}
          workingCast={schedule.stats.workingCast}
          averageWorkingHours={schedule.stats.averageWorkingHours}
          averageWorkingCast={schedule.stats.averageWorkingCast}
        />
        <ScheduleActionButtons
          onRefresh={handleRefresh}
          date={date}
          onDateChange={setDate}
          stores={availableStores.map((store) => ({
            id: store.id,
            displayName: store.displayName || store.name,
          }))}
          selectedStoreId={currentStore.id}
          onStoreChange={switchStore}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          characterFilter={characterFilter}
          onCharacterFilterChange={setCharacterFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>
      <ScheduleGrid
        className="min-h-0 flex-1"
        startDate={schedule.startDate}
        entries={filteredEntries}
        onSaveSchedule={handleSaveSchedule}
        viewMode={viewMode}
      />
    </div>
  )
}

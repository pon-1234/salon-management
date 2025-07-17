'use client'

import React, { useState, useEffect } from 'react'
import { ScheduleGrid } from '@/components/cast-schedule/schedule-grid'
import { CastScheduleUseCases } from '@/lib/cast-schedule/usecases'
import { WeeklySchedule } from '@/lib/cast-schedule/old-types'
import { Header } from '@/components/header'
import { ScheduleInfoBar } from '@/components/cast-schedule/schedule-info-bar'
import { ScheduleActionButtons } from '@/components/cast-schedule/schedule-action-buttons'
import { toast } from '@/hooks/use-toast'

const castScheduleUseCases = new CastScheduleUseCases()

export default function WeeklySchedulePage() {
  const [date, setDate] = useState(() => new Date())
  const [schedule, setSchedule] = useState<WeeklySchedule | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSchedule = async () => {
      setLoading(true)
      try {
        const weeklySchedule = await castScheduleUseCases.getWeeklySchedule({
          date,
          castFilter: 'all',
        })
        setSchedule(weeklySchedule)
      } catch (error) {
        console.error('Failed to fetch schedule:', error)
        toast({
          title: 'エラー',
          description: 'スケジュールの取得に失敗しました',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchSchedule()
  }, [date])

  if (loading || !schedule) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600"></div>
            <p className="text-gray-600">読み込み中...</p>
          </div>
        </div>
      </div>
    )
  }

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const weeklySchedule = await castScheduleUseCases.getWeeklySchedule({
        date,
        castFilter: 'all',
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

  const handleFilter = () => {
    // Filter logic can be implemented here
  }

  const handleFilterCharacter = () => {
    // Character filter logic can be implemented here
  }

  const handleSaveSchedule = async (castId: string, schedule: any) => {
    // Optimistic update - immediately update UI
    setSchedule((prev) => {
      if (!prev) return prev

      return {
        ...prev,
        entries: prev.entries.map((entry) => {
          if (entry.castId === castId) {
            return {
              ...entry,
              schedule,
            }
          }
          return entry
        }),
      }
    })

    try {
      // Convert schedule format for batch API
      const schedules = Object.entries(schedule).map(([dateStr, daySchedule]: [string, any]) => {
        if (daySchedule.status === '出勤予定' && daySchedule.startTime && daySchedule.endTime) {
          return {
            date: dateStr,
            status: 'working' as const,
            startTime: daySchedule.startTime,
            endTime: daySchedule.endTime,
          }
        } else {
          return {
            date: dateStr,
            status: 'holiday' as const,
          }
        }
      })

      // Use batch API for better performance
      const response = await fetch('/api/cast-schedule/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          castId,
          schedules,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'スケジュールの保存に失敗しました')
      }

      const result = await response.json()

      toast({
        title: '成功',
        description: result.message || 'スケジュールを保存しました',
      })

      // Refresh the schedule to ensure consistency
      await handleRefresh()
    } catch (error) {
      console.error('Failed to save schedule:', error)

      // Revert optimistic update on error
      await handleRefresh()

      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'スケジュールの保存に失敗しました',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <ScheduleInfoBar
        totalCast={schedule.stats.totalCast}
        workingCast={schedule.stats.workingCast}
        averageWorkingHours={schedule.stats.averageWorkingHours}
        averageWorkingCast={schedule.stats.averageWorkingCast}
      />
      <ScheduleActionButtons
        onRefresh={handleRefresh}
        onFilter={handleFilter}
        onFilterCharacter={handleFilterCharacter}
        date={date}
        onDateChange={setDate}
      />
      <ScheduleGrid
        startDate={schedule.startDate}
        entries={schedule.entries}
        onSaveSchedule={handleSaveSchedule}
      />
    </div>
  )
}

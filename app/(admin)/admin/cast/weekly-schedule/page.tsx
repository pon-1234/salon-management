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
    try {
      // Convert the schedule format to match API expectations
      const promises = Object.entries(schedule).map(
        async ([dateStr, daySchedule]: [string, any]) => {
          if (daySchedule.status === '出勤予定' && daySchedule.startTime && daySchedule.endTime) {
            // Create or update schedule
            const date = new Date(dateStr)
            const startDateTime = new Date(`${dateStr}T${daySchedule.startTime}:00`)
            const endDateTime = new Date(`${dateStr}T${daySchedule.endTime}:00`)

            // Check if schedule exists for this date
            const existingSchedules = await fetch(
              `/api/cast-schedule?castId=${castId}&date=${dateStr}`
            )
            const existing = await existingSchedules.json()

            if (existing.length > 0) {
              // Update existing schedule
              await fetch('/api/cast-schedule', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: existing[0].id,
                  startTime: startDateTime,
                  endTime: endDateTime,
                  isAvailable: true,
                }),
              })
            } else {
              // Create new schedule
              await fetch('/api/cast-schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  castId,
                  date,
                  startTime: startDateTime,
                  endTime: endDateTime,
                  isAvailable: true,
                }),
              })
            }
          } else if (daySchedule.status === '休日') {
            // Delete existing schedule if any
            const existingSchedules = await fetch(
              `/api/cast-schedule?castId=${castId}&date=${dateStr}`
            )
            const existing = await existingSchedules.json()

            if (existing.length > 0) {
              await fetch(`/api/cast-schedule?id=${existing[0].id}`, {
                method: 'DELETE',
              })
            }
          }
        }
      )

      await Promise.all(promises)

      toast({
        title: '成功',
        description: 'スケジュールを保存しました',
      })

      // Refresh the schedule
      handleRefresh()
    } catch (error) {
      console.error('Failed to save schedule:', error)
      toast({
        title: 'エラー',
        description: 'スケジュールの保存に失敗しました',
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

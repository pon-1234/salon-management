'use client'

import React, { useState, useEffect } from 'react'
import { ScheduleGrid } from '@/components/cast-schedule/schedule-grid'
import { CastScheduleUseCases } from '@/lib/cast-schedule/usecases'
import { WeeklySchedule } from '@/lib/cast-schedule/old-types'
import { Header } from '@/components/header'
import { ScheduleInfoBar } from '@/components/cast-schedule/schedule-info-bar'
import { ScheduleActionButtons } from '@/components/cast-schedule/schedule-action-buttons'

const castScheduleUseCases = new CastScheduleUseCases()

export default function WeeklySchedulePage() {
  const [date, setDate] = useState(() => new Date())
  const [schedule, setSchedule] = useState<WeeklySchedule | null>(null)

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const weeklySchedule = await castScheduleUseCases.getWeeklySchedule({
          date,
          castFilter: 'all',
        })
        setSchedule(weeklySchedule)
      } catch (error) {
        console.error('Failed to fetch schedule:', error)
      }
    }

    fetchSchedule()
  }, [date])

  if (!schedule) {
    return <div>Loading...</div>
  }

  const handleRefresh = () => {
    const fetchSchedule = async () => {
      try {
        const weeklySchedule = await castScheduleUseCases.getWeeklySchedule({
          date,
          castFilter: 'all',
        })
        setSchedule(weeklySchedule)
      } catch (error) {
        console.error('Failed to fetch schedule:', error)
      }
    }
    fetchSchedule()
  }

  const handleFilter = () => {
    // Filter logic can be implemented here
  }

  const handleFilterCharacter = () => {
    // Character filter logic can be implemented here
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
      <ScheduleGrid startDate={schedule.startDate} entries={schedule.entries} />
    </div>
  )
}

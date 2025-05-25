"use client"

import React, { useState, useEffect } from "react"
import { ScheduleGrid } from "@/components/staff-schedule/schedule-grid"
import { StaffScheduleUseCases } from "@/lib/staff-schedule/usecases"
import { WeeklySchedule } from "@/lib/staff-schedule/types"
import { Header } from "@/components/header"
import { ScheduleInfoBar } from "@/components/staff-schedule/schedule-info-bar"
import { ScheduleActionButtons } from "@/components/staff-schedule/schedule-action-buttons"

const staffScheduleUseCases = new StaffScheduleUseCases()

export default function WeeklySchedulePage() {
  const [date] = useState(() => new Date())
  const [schedule, setSchedule] = useState<WeeklySchedule | null>(null)

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const weeklySchedule = await staffScheduleUseCases.getWeeklySchedule({ 
          date, 
          staffFilter: "all" 
        })
        setSchedule(weeklySchedule)
      } catch (error) {
        console.error("Failed to fetch schedule:", error)
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
        const weeklySchedule = await staffScheduleUseCases.getWeeklySchedule({ 
          date, 
          staffFilter: "all" 
        })
        setSchedule(weeklySchedule)
      } catch (error) {
        console.error("Failed to fetch schedule:", error)
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
    <div className="min-h-screen bg-white">
      <Header />
      <ScheduleInfoBar 
        totalStaff={schedule.stats.totalStaff}
        workingStaff={schedule.stats.workingStaff}
        averageWorkingHours={schedule.stats.averageWorkingHours}
        averageWorkingStaff={schedule.stats.averageWorkingStaff}
      />
      <ScheduleActionButtons
        onRefresh={handleRefresh}
        onFilter={handleFilter}
        onFilterCharacter={handleFilterCharacter}
        date={date}
        onDateChange={() => {}}
      />
      <main className="p-4">
        <ScheduleGrid
          startDate={schedule.startDate}
          entries={schedule.entries}
        />
      </main>
    </div>
  )
}

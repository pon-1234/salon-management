"use client"

import React, { useState, useEffect } from "react"
import { ScheduleHeader } from "@/components/staff-schedule/schedule-header"
import { ScheduleGrid } from "@/components/staff-schedule/schedule-grid"
import { StaffScheduleUseCases } from "@/lib/staff-schedule/usecases"
import { WeeklySchedule } from "@/lib/staff-schedule/types"
import { Header } from "@/components/header"

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto py-6 px-4">
        <ScheduleHeader
          date={date}
          onDateChange={() => {}}
          totalStaff={schedule.stats.totalStaff}
          workingStaff={schedule.stats.workingStaff}
          averageWorkingHours={schedule.stats.averageWorkingHours}
          averageWorkingStaff={schedule.stats.averageWorkingStaff}
        />
        <ScheduleGrid
          startDate={schedule.startDate}
          entries={schedule.entries}
        />
      </main>
    </div>
  )
}

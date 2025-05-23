"use client"

import { useState } from "react"
import { ScheduleHeader } from "@/components/staff-schedule/schedule-header"
import { ScheduleGrid } from "@/components/staff-schedule/schedule-grid"
import { StaffScheduleUseCases } from "@/lib/staff-schedule/usecases"
import { WeeklySchedule } from "@/lib/staff-schedule/types"
import { Header } from "@/components/header"

const staffScheduleUseCases = new StaffScheduleUseCases()

export default function WeeklySchedulePage() {
  const [date] = useState(() => new Date())
  const [schedule, setSchedule] = useState<WeeklySchedule | null>(null)

  // In a real application, this would be in a useEffect
  if (!schedule) {
    staffScheduleUseCases.getWeeklySchedule({ date, staffFilter: "all" }).then(setSchedule)
  }

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

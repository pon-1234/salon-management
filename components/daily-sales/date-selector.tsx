"use client"

import { format } from "date-fns"
import { ja } from "date-fns/locale"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DateSelectorProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
}

export function DateSelector({ selectedDate, onDateChange }: DateSelectorProps) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 2 }, (_, i) => currentYear - i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const days = Array.from(
    { length: new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate() },
    (_, i) => i + 1
  )

  return (
    <div className="flex gap-2 items-center">
      <Select
        value={selectedDate.getFullYear().toString()}
        onValueChange={(value) => {
          const newDate = new Date(selectedDate)
          newDate.setFullYear(parseInt(value))
          onDateChange(newDate)
        }}
      >
        <SelectTrigger className="w-[100px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}年
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={(selectedDate.getMonth() + 1).toString()}
        onValueChange={(value) => {
          const newDate = new Date(selectedDate)
          newDate.setMonth(parseInt(value) - 1)
          onDateChange(newDate)
        }}
      >
        <SelectTrigger className="w-[100px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {months.map((month) => (
            <SelectItem key={month} value={month.toString()}>
              {month}月
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={selectedDate.getDate().toString()}
        onValueChange={(value) => {
          const newDate = new Date(selectedDate)
          newDate.setDate(parseInt(value))
          onDateChange(newDate)
        }}
      >
        <SelectTrigger className="w-[100px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {days.map((day) => (
            <SelectItem key={day} value={day.toString()}>
              {day}日
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

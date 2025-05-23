"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker } from "react-day-picker"
import { ja } from 'date-fns/locale'
import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  selectedDay?: Date | undefined
  onSelectedDayChange?: (day?: Date) => void
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  selectedDay,
  onSelectedDayChange,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      mode="single"
      locale={ja}
      showOutsideDays={showOutsideDays}
      selected={selectedDay}
      onSelect={onSelectedDayChange}
      className={cn("p-3", className)}
      classNames={{
        // 全体
        months: "space-y-4",
        month: "space-y-4",

        // タイトル・ナビゲーション
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "flex items-center justify-center space-x-1",
        nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border rounded",

        // テーブルレイアウト
        table: "w-full border-collapse table-fixed",
        head_cell: "text-center text-[0.8rem] font-normal text-muted-foreground p-2",
        cell: "p-0 h-9 w-9 text-center align-middle",

        // 日付セル（day）
        day: cn(
          "cursor-pointer",
          "h-9 w-9 p-0 text-sm font-normal text-center align-middle",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:opacity-50 disabled:pointer-events-none",
          "aria-selected:opacity-100"
        ),

        // ここではselectedなどは設定せず、modifiersClassNamesで対応
        ...classNames,
      }}
      modifiersClassNames={{
        selected: "bg-emerald-600 text-white font-bold rounded-full hover:bg-emerald-700",
        today: "bg-accent text-accent-foreground",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }

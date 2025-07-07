import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react'
import { useState } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface DateNavigationProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
}

export function DateNavigation({ selectedDate, onSelectDate }: DateNavigationProps) {
  const DAYS_OF_WEEK_JP = ['日', '月', '火', '水', '木', '金', '土']

  // baseDate: 現在表示している週の開始日 (初期値はselectedDateでOK)
  const [baseDate, setBaseDate] = useState(new Date(selectedDate))
  const [calendarOpen, setCalendarOpen] = useState(false)

  // 7日分の日付リストを作成
  const dates = Array.from({ length: 7 }, (_, i) => {
    const currentDate = new Date(baseDate)
    currentDate.setDate(baseDate.getDate() + i)
    const dayOfMonth = currentDate.getDate()
    const dayOfWeek = DAYS_OF_WEEK_JP[currentDate.getDay()]
    return {
      date: currentDate,
      label: `${dayOfMonth}日(${dayOfWeek})`,
      active: currentDate.toDateString() === selectedDate.toDateString(),
    }
  })

  // 前週へ移動
  const handlePrevWeek = () => {
    const newBase = new Date(baseDate)
    newBase.setDate(newBase.getDate() - 7)
    setBaseDate(newBase)
  }

  // 次週へ移動
  const handleNextWeek = () => {
    const newBase = new Date(baseDate)
    newBase.setDate(newBase.getDate() + 7)
    setBaseDate(newBase)
  }

  // カレンダーで日付選択
  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      onSelectDate(date)
      setBaseDate(date)
      setCalendarOpen(false)
    }
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(selectedDate, 'yyyy年MM月dd日(E)', { locale: ja })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              selectedDay={selectedDate}
              onSelectedDayChange={handleCalendarSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto">
        <Button variant="outline" size="icon" onClick={handlePrevWeek}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex gap-2">
          {dates.map((item, index) => (
            <Button
              key={index}
              variant={item.active ? 'default' : 'outline'}
              className={`rounded-full ${item.active ? 'bg-emerald-600 text-white' : ''}`}
              onClick={() => onSelectDate(item.date)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="icon" onClick={handleNextWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

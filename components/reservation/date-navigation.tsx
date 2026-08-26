/**
 * @design_doc   Reservation timeline date navigation and past-booking guard
 * @related_to   ReservationPageContent and Calendar
 * @known_issues None
 */
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react'
import { useState } from 'react'
import { addDays } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { ja } from 'date-fns/locale'

const JST_TIMEZONE = 'Asia/Tokyo'

const dateKeyInJapan = (date: Date): string => formatInTimeZone(date, JST_TIMEZONE, 'yyyy-MM-dd')

interface DateNavigationProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
}

export function DateNavigation({ selectedDate, onSelectDate }: DateNavigationProps) {
  const DAYS_OF_WEEK_JP = ['日', '月', '火', '水', '木', '金', '土']
  const today = new Date()
  const todayKey = dateKeyInJapan(today)

  // baseDate: 現在表示している週の開始日 (初期値はselectedDateでOK)
  const [baseDate, setBaseDate] = useState(() =>
    dateKeyInJapan(selectedDate) < todayKey ? today : new Date(selectedDate)
  )
  const [calendarOpen, setCalendarOpen] = useState(false)

  // 7日分の日付リストを作成
  const dates = Array.from({ length: 7 }, (_, i) => {
    const currentDate = addDays(baseDate, i)
    const dayOfMonth = Number(formatInTimeZone(currentDate, JST_TIMEZONE, 'd'))
    const dayOfWeek = DAYS_OF_WEEK_JP[Number(formatInTimeZone(currentDate, JST_TIMEZONE, 'i')) % 7]
    return {
      date: currentDate,
      label: `${dayOfMonth}日(${dayOfWeek})`,
      active: dateKeyInJapan(currentDate) === dateKeyInJapan(selectedDate),
      disabled: dateKeyInJapan(currentDate) < todayKey,
    }
  })

  // 前週へ移動
  const handlePrevWeek = () => {
    const candidate = addDays(baseDate, -7)
    setBaseDate(dateKeyInJapan(candidate) < todayKey ? today : candidate)
  }

  // 次週へ移動
  const handleNextWeek = () => {
    setBaseDate(addDays(baseDate, 7))
  }

  // カレンダーで日付選択
  const handleCalendarSelect = (date: Date | undefined) => {
    if (date && dateKeyInJapan(date) >= todayKey) {
      onSelectDate(date)
      setBaseDate(date)
      setCalendarOpen(false)
    }
  }

  return (
    <div className="px-2 py-1">
      <div className="flex items-center gap-2 overflow-x-auto">
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-[220px] shrink-0 justify-start text-left text-xs font-normal"
            >
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {formatInTimeZone(selectedDate, JST_TIMEZONE, 'yyyy年MM月dd日(E)', {
                locale: ja,
              })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              selectedDay={selectedDate}
              onSelectedDayChange={handleCalendarSelect}
              disabled={(date) => dateKeyInJapan(date) < todayKey}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={handlePrevWeek}
          aria-label="前の週へ"
          disabled={dateKeyInJapan(baseDate) <= todayKey}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex gap-1">
          {dates.map((item, index) => (
            <Button
              key={index}
              variant={item.active ? 'default' : 'outline'}
              size="sm"
              className={`h-8 rounded-full px-2.5 text-xs ${item.active ? 'bg-emerald-600 text-white' : ''}`}
              onClick={() => onSelectDate(item.date)}
              disabled={item.disabled}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={handleNextWeek}
          aria-label="次の週へ"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

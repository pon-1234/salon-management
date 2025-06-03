import { Button } from "@/components/ui/button"
import { RefreshCw, Filter, Calendar } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ScheduleActionButtonsProps {
  onRefresh: () => void;
  onFilter: () => void;
  onFilterCharacter: () => void;
  date: Date;
  onDateChange: (date: Date) => void;
}

export function ScheduleActionButtons({ 
  onRefresh, 
  onFilter, 
  onFilterCharacter,
  date,
  onDateChange 
}: ScheduleActionButtonsProps) {
  const characters = ["全", "あ", "か", "さ", "た", "な", "は", "ま", "や", "ら", "わ", "その他"]

  return (
    <div className="space-y-4 p-4 border-b">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button onClick={onRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            更新
          </Button>
          <Button onClick={onFilter} variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            フィルター
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <Select defaultValue="today">
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">今日</SelectItem>
              <SelectItem value="tomorrow">明日</SelectItem>
              <SelectItem value="week">週間</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm font-medium">担当者：</span>
          <Select defaultValue="all">
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全て表示</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {characters.map((char) => (
          <Button
            key={char}
            variant="outline"
            size="sm"
            onClick={() => onFilterCharacter()}
            className="text-sm"
          >
            {char}
          </Button>
        ))}
      </div>
    </div>
  )
}
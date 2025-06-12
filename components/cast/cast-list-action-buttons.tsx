import { Button } from "@/components/ui/button"
import { RefreshCw, Filter, PlusCircle } from 'lucide-react'
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"

interface CastListActionButtonsProps {
  onRefresh: () => void;
  onFilterCharacter: (char: string) => void;
  onFilter: () => void;
  nameSearch: string;
  onNameSearchChange: (value: string) => void;
  workStatus: string;
  onWorkStatusChange: (value: string) => void;
}

export function CastListActionButtons({ 
  onRefresh, 
  onFilterCharacter, 
  onFilter,
  nameSearch,
  onNameSearchChange,
  workStatus,
  onWorkStatusChange
}: CastListActionButtonsProps) {
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
        <Link href="/admin/cast/manage/new">
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <PlusCircle className="w-4 h-4 mr-2" />
            新規キャスト追加
          </Button>
        </Link>
      </div>

      <div className="flex gap-4 items-center">
        <Select value={workStatus} onValueChange={onWorkStatusChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="就業中(公開)">就業中(公開)</SelectItem>
            <SelectItem value="休職中">休職中</SelectItem>
            <SelectItem value="退職">退職</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="search"
          placeholder="本名検索"
          value={nameSearch}
          onChange={(e) => onNameSearchChange(e.target.value)}
          className="w-[200px]"
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        {characters.map((char) => (
          <Button
            key={char}
            variant="outline"
            size="sm"
            onClick={() => onFilterCharacter(char)}
            className="text-sm"
          >
            {char}
          </Button>
        ))}
      </div>
    </div>
  )
}
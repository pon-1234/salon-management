import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { MapPin, Users, CreditCard } from 'lucide-react'
import { Option as CourseOption } from '@/lib/types/course-option'

interface StepDetailsProps {
  bookingDetails: any
  availableOptions: CourseOption[]
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void
  onCheckboxChange: (name: string, checked: boolean) => void
}

export function StepDetails({
  bookingDetails,
  availableOptions,
  onInputChange,
  onCheckboxChange,
}: StepDetailsProps) {
  return (
    <div className="space-y-6">
      {/* Location Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center">
            <MapPin className="mr-2 h-5 w-5" />
            場所詳細
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>都道府県</Label>
              <Select
                value={bookingDetails.prefecture}
                onValueChange={(value) =>
                  onInputChange({ target: { name: 'prefecture', value } } as any)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="東京都">東京都</SelectItem>
                  <SelectItem value="神奈川県">神奈川県</SelectItem>
                  <SelectItem value="埼玉県">埼玉県</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>地区</Label>
              <Select
                value={bookingDetails.district}
                onValueChange={(value) =>
                  onInputChange({ target: { name: 'district', value } } as any)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="豊島区">豊島区</SelectItem>
                  <SelectItem value="新宿区">新宿区</SelectItem>
                  <SelectItem value="渋谷区">渋谷区</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>詳細場所</Label>
            <Textarea
              value={bookingDetails.specificLocation}
              onChange={onInputChange}
              name="specificLocation"
              placeholder="例: グランドホテル 605号室"
            />
          </div>
        </CardContent>
      </Card>

      {/* Options */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            オプション・追加サービス
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {availableOptions.map((option) => (
              <div
                key={option.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center">
                  <Checkbox
                    id={option.id}
                    checked={bookingDetails.options[option.name] || false}
                    onCheckedChange={(checked) => onCheckboxChange(option.name, checked as boolean)}
                  />
                  <Label htmlFor={option.id} className="ml-3 cursor-pointer font-medium">
                    {option.name}
                  </Label>
                </div>
                <Badge variant="secondary">
                  {option.price === 0 ? '無料' : `+${option.price.toLocaleString()}円`}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center">
            <CreditCard className="mr-2 h-5 w-5" />
            お支払い方法
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={bookingDetails.paymentMethod}
            onValueChange={(value) =>
              onInputChange({ target: { name: 'paymentMethod', value } } as any)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="現金">現金</SelectItem>
              <SelectItem value="クレジットカード">クレジットカード</SelectItem>
              <SelectItem value="ポイント利用">ポイント利用</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  )
}

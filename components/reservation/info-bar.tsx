import { Alert, AlertDescription } from '@/components/ui/alert'
import { InfoIcon } from 'lucide-react'

interface InfoBarProps {
  selectedCustomer: { id: string; name: string } | null
}

export function InfoBar({ selectedCustomer }: InfoBarProps) {
  if (selectedCustomer) {
    return (
      <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
        <AlertDescription className="flex items-center">
          <InfoIcon className="mr-2 h-4 w-4" />
          現在選択中の顧客：{selectedCustomer.name} 様
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className="border-yellow-200 bg-yellow-50 text-yellow-800">
      <AlertDescription className="flex items-center">
        <InfoIcon className="mr-2 h-4 w-4" />
        顧客が未選択です。『この顧客で予約を取る』ボタンから顧客を選択すると、簡単予約が可能になります。
      </AlertDescription>
    </Alert>
  )
}

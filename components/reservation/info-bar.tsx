import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon } from 'lucide-react'

interface InfoBarProps {
  selectedCustomer: { id: string; name: string } | null;
}

export function InfoBar({ selectedCustomer }: InfoBarProps) {
  if (selectedCustomer) {
    return (
      <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800">
        <AlertDescription className="flex items-center">
          <InfoIcon className="h-4 w-4 mr-2" />
          現在選択中の顧客：{selectedCustomer.name} 様
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
      <AlertDescription className="flex items-center">
        <InfoIcon className="h-4 w-4 mr-2" />
        顧客が未選択です。『この顧客で予約を取る』ボタンから顧客を選択すると、簡単予約が可能になります。
      </AlertDescription>
    </Alert>
  )
}

/**
 * @design_doc   Selected-customer context for reservation creation
 * @related_to   ActionButtons and ReservationPageContent
 * @known_issues None
 */
import { Alert, AlertDescription } from '@/components/ui/alert'
import { InfoIcon } from 'lucide-react'

interface InfoBarProps {
  selectedCustomer: { id: string; name: string } | null
}

export function InfoBar({ selectedCustomer }: InfoBarProps) {
  if (selectedCustomer) {
    return (
      <Alert className="border-emerald-200 bg-emerald-50 py-1.5 text-emerald-800">
        <AlertDescription className="flex items-center text-xs">
          <InfoIcon className="mr-2 h-4 w-4" />
          現在選択中の顧客：{selectedCustomer.name} 様
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className="border-yellow-200 bg-yellow-50 py-1.5 text-yellow-800">
      <AlertDescription className="flex items-center text-xs">
        <InfoIcon className="mr-2 h-4 w-4" />
        顧客が未選択です。『この顧客で予約を取る』ボタンから顧客を選択すると、予約作成ができます。
      </AlertDescription>
    </Alert>
  )
}

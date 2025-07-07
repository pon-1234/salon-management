import { Alert, AlertDescription } from '@/components/ui/alert'
import { InfoIcon } from 'lucide-react'

export function CastListInfoBar() {
  return (
    <Alert className="border-yellow-200 bg-yellow-50 text-yellow-800">
      <AlertDescription className="flex items-center">
        <InfoIcon className="mr-2 h-4 w-4" />
        ※業務連絡を開くと既読になりますのでご注意下さい。
      </AlertDescription>
    </Alert>
  )
}

import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon } from 'lucide-react'

export function CastListInfoBar() {
  return (
    <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
      <AlertDescription className="flex items-center">
        <InfoIcon className="h-4 w-4 mr-2" />
        ※業務連絡を開くと既読になりますのでご注意下さい。
      </AlertDescription>
    </Alert>
  )
}
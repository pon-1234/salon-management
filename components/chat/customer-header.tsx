import { Button } from "@/components/ui/button"
import { UserCircle, Archive } from 'lucide-react'
import Link from "next/link"

interface CustomerHeaderProps {
  customer?: {
    id: string
    name: string
  }
}

export function CustomerHeader({ customer }: CustomerHeaderProps) {
  return (
    <div className="h-[60px] border-b bg-white px-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-medium">{customer?.name ? `${customer.name} 様` : '顧客が選択されていません'}</h2>
      </div>
      {customer && (
        <div className="flex items-center gap-2">
          <Link href={`/customers/${customer.id}`}>
            <Button variant="ghost" size="sm" className="text-gray-600">
              <UserCircle className="h-5 w-5 mr-2" />
              顧客情報
            </Button>
          </Link>
          <Button variant="ghost" size="sm" className="text-gray-600">
            <Archive className="h-5 w-5 mr-2" />
            送信済みメッセージを削除
          </Button>
        </div>
      )}
    </div>
  )
}

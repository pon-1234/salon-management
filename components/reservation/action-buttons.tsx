/**
 * @design_doc   Admin reservation timeline creation controls
 * @related_to   CustomerSelectionDialog and ReservationPageContent
 * @known_issues None
 */
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, Filter, UserPlus, UserMinus, History } from 'lucide-react'
import { CustomerSelectionDialog } from '@/components/customer/customer-selection-dialog'
import { Customer } from '@/lib/customer/types'
import Link from 'next/link'

interface ActionButtonsProps {
  onRefresh: () => void
  onFilter: () => void
  onCustomerSelect: (customer: Customer | null) => void
  selectedCustomer: Customer | null
  canCreateReservation: boolean
}

export function ActionButtons({
  onRefresh,
  onFilter,
  onCustomerSelect,
  selectedCustomer,
  canCreateReservation,
}: ActionButtonsProps) {
  const [showCustomerDialog, setShowCustomerDialog] = useState(false)

  return (
    <div className="flex items-center justify-between px-2 py-1">
      <div className="flex gap-1">
        <Button onClick={onRefresh} variant="outline" size="sm" className="h-8 text-xs">
          <RefreshCw className="mr-2 h-4 w-4" />
          更新
        </Button>
        <Button onClick={onFilter} variant="outline" size="sm" className="h-8 text-xs">
          <Filter className="mr-2 h-4 w-4" />
          フィルター
        </Button>
        {selectedCustomer ? (
          <>
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link href={`/admin/customers/${selectedCustomer.id}`}>
                <History className="mr-2 h-4 w-4" />
                顧客情報
              </Link>
            </Button>
            <Button
              onClick={() => onCustomerSelect(null)}
              variant="outline"
              size="sm"
              className="h-8 text-xs"
            >
              <UserMinus className="mr-2 h-4 w-4" />
              顧客選択を解除
            </Button>
          </>
        ) : canCreateReservation ? (
          <Button
            onClick={() => setShowCustomerDialog(true)}
            variant="outline"
            size="sm"
            className="h-8 text-xs"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            この顧客で予約を取る
          </Button>
        ) : null}
      </div>
      {canCreateReservation ? (
        <CustomerSelectionDialog
          open={showCustomerDialog}
          onOpenChange={setShowCustomerDialog}
          onSelectCustomer={(customer) => {
            onCustomerSelect(customer)
            setShowCustomerDialog(false)
          }}
        />
      ) : null}
    </div>
  )
}

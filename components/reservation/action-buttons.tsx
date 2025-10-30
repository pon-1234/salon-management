import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, Filter, UserPlus, UserMinus } from 'lucide-react'
import { CustomerSelectionDialog } from '@/components/customer/customer-selection-dialog'
import { Customer } from '@/lib/customer/types'

interface ActionButtonsProps {
  onRefresh: () => void
  onFilter: () => void
  onCustomerSelect: (customer: Customer | null) => void
  selectedCustomer: Customer | null
}

export function ActionButtons({
  onRefresh,
  onFilter,
  onCustomerSelect,
  selectedCustomer,
}: ActionButtonsProps) {
  const [showCustomerDialog, setShowCustomerDialog] = useState(false)

  return (
    <div className="flex items-center justify-between border-b p-4">
      <div className="flex gap-2">
        <Button onClick={onRefresh} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          更新
        </Button>
        <Button onClick={onFilter} variant="outline" size="sm">
          <Filter className="mr-2 h-4 w-4" />
          フィルター
        </Button>
        {selectedCustomer ? (
          <Button onClick={() => onCustomerSelect(null)} variant="outline" size="sm">
            <UserMinus className="mr-2 h-4 w-4" />
            顧客選択を解除
          </Button>
        ) : (
          <Button onClick={() => setShowCustomerDialog(true)} variant="outline" size="sm">
            <UserPlus className="mr-2 h-4 w-4" />
            この顧客で予約を取る
          </Button>
        )}
      </div>
      <CustomerSelectionDialog
        open={showCustomerDialog}
        onOpenChange={setShowCustomerDialog}
        onSelectCustomer={(customer) => {
          onCustomerSelect(customer)
          setShowCustomerDialog(false)
        }}
      />
    </div>
  )
}

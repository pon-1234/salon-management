import { Button } from "@/components/ui/button"
import { RefreshCw, Filter, UserPlus, UserMinus } from 'lucide-react'
import { useState } from "react"
import { QuickBookingDialog } from "./quick-booking-dialog"
import { FilterDialog } from "./filter-dialog"

interface ActionButtonsProps {
  onRefresh: () => void;
  onFilter: () => void;
  onCustomerSelect: (customer: { id: string; name: string } | null) => void;
  selectedCustomer: { id: string; name: string } | null;
}

export function ActionButtons({ onRefresh, onFilter, onCustomerSelect, selectedCustomer }: ActionButtonsProps) {
  const [openQuickBooking, setOpenQuickBooking] = useState(false)
  const [openFilter, setOpenFilter] = useState(false)

  return (
    <div className="flex justify-between items-center p-4 border-b">
      <div className="flex gap-2">
        <Button onClick={onRefresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          更新
        </Button>
        <Button onClick={onFilter} variant="outline" size="sm">
          <Filter className="w-4 h-4 mr-2" />
          フィルター
        </Button>
        {selectedCustomer ? (
          <Button 
            onClick={() => onCustomerSelect(null)} 
            variant="outline" 
            size="sm"
          >
            <UserMinus className="w-4 h-4 mr-2" />
            顧客選択を解除
          </Button>
        ) : (
          <Button 
            onClick={() => onCustomerSelect({ id: "dummy-id", name: "山田太郎" })} 
            variant="outline" 
            size="sm"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            この顧客で予約を取る
          </Button>
        )}
      </div>
      <div className="flex gap-2">
        <Button onClick={() => setOpenQuickBooking(true)} variant="outline" size="sm">
          新規予約
        </Button>
        <Button onClick={() => setOpenFilter(true)} variant="outline" size="sm">
          絞り込み
        </Button>
      </div>
      <QuickBookingDialog open={openQuickBooking} onOpenChange={setOpenQuickBooking} selectedCustomer={null} />
      <FilterDialog open={openFilter} onOpenChange={setOpenFilter} onApplyFilters={() => {}} />
    </div>
  )
}

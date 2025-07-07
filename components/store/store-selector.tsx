'use client'

import { useState } from 'react'
import { useStore } from '@/contexts/store-context'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Building2, ChevronDown } from 'lucide-react'

export function StoreSelector() {
  const { currentStore, availableStores, isSuperAdmin, switchStore } = useStore()
  const [open, setOpen] = useState(false)

  if (!isSuperAdmin || availableStores.length <= 1) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Building2 className="h-4 w-4" />
        <span className="font-medium">{currentStore.displayName}</span>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="flex h-auto items-center gap-2 px-3 py-2">
          <Building2 className="h-4 w-4" />
          <span className="text-sm font-medium">{currentStore.displayName}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>店舗を選択</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select
            value={currentStore.slug}
            onValueChange={(value) => {
              switchStore(value)
              setOpen(false)
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableStores.map((store) => (
                <SelectItem key={store.id} value={store.slug}>
                  <div className="flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: store.theme?.primaryColor }}
                    />
                    <div>
                      <div className="font-medium">{store.name}</div>
                      <div className="text-sm text-gray-500">{store.displayName}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="space-y-2 text-xs text-gray-500">
            <div>
              現在の店舗: <span className="font-medium">{currentStore.name}</span>
            </div>
            <div>
              営業時間: 平日 {currentStore.openingHours.weekday.open} -{' '}
              {currentStore.openingHours.weekday.close}
            </div>
            <div>電話番号: {currentStore.phone}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

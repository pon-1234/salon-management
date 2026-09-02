/**
 * @design_doc   Notion #281 hotel master integration for reservation creation
 * @related_to   QuickBookingDialog and the store-scoped hotel settings API
 * @known_issues None known
 */
'use client'

import { useEffect, useState } from 'react'
import { buildStoreScopedEndpoint } from '@/lib/store/endpoints'

export type HotelOption = {
  id: string
  hotelName: string
  area?: string | null
  station?: string | null
}

export function useHotelOptions(open: boolean, storeId?: string): HotelOption[] {
  const [hotels, setHotels] = useState<HotelOption[]>([])

  useEffect(() => {
    if (!open || !storeId) return
    const controller = new AbortController()
    const loadHotels = async () => {
      try {
        const response = await fetch(buildStoreScopedEndpoint('/api/settings/hotel', storeId), {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!response.ok) return
        const payload = await response.json()
        const list = Array.isArray(payload?.data) ? payload.data : []
        setHotels(
          list
            .filter((hotel: unknown) =>
              Boolean(hotel && typeof hotel === 'object' && 'id' in hotel && 'hotelName' in hotel)
            )
            .map(
              (hotel: { id: unknown; hotelName: unknown; area?: unknown; station?: unknown }) => ({
                id: String(hotel.id),
                hotelName: String(hotel.hotelName),
                area: typeof hotel.area === 'string' ? hotel.area : null,
                station: typeof hotel.station === 'string' ? hotel.station : null,
              })
            )
        )
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.warn('[QuickBookingDialog] Failed to load hotel master', error)
        }
      }
    }
    void loadHotels()
    return () => controller.abort()
  }, [open, storeId])

  return hotels
}

/**
 * @design_doc https://app.notion.com/p/3ccdda8d8bde80ec928cc17adff35cde
 * @related_to QuickBookingVisitDetails and ReservationDialog share hotel master selection
 * @known_issues Display regions do not change service areas or transport fees
 */
'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import type { HotelOption } from './use-hotel-options'

export function formatHotelOptionLabel(hotel: HotelOption) {
  const area = hotel.area?.trim()
  return [area && !hotel.hotelName.includes(area) ? area : null, hotel.station, hotel.hotelName]
    .filter(Boolean)
    .join(' ＞ ')
}

export function HotelPicker({
  id,
  label,
  hotels,
  hotelName,
  onChange,
  disabled = false,
}: {
  id: string
  label: string
  hotels: HotelOption[]
  hotelName: string
  onChange: (name: string) => void
  disabled?: boolean
}) {
  const [area, setArea] = useState('')
  const [station, setStation] = useState('')
  const areas = Array.from(
    new Set(hotels.map((hotel) => hotel.area).filter((value): value is string => Boolean(value)))
  )
  const areaHotels = hotels.filter((hotel) => !area || hotel.area === area)
  const stations = Array.from(
    new Set(
      areaHotels.map((hotel) => hotel.station).filter((value): value is string => Boolean(value))
    )
  )
  const filtered = areaHotels.filter((hotel) => !station || hotel.station === station)
  const selected = hotels.find((hotel) => hotel.hotelName === hotelName)
  const className =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50'
  return (
    <div className="space-y-2">
      {areas.length > 0 || stations.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor={`${id}-area`}>地域</Label>
            <select
              id={`${id}-area`}
              aria-label={`${label}の地域`}
              className={className}
              value={area}
              disabled={disabled}
              onChange={(event) => {
                setArea(event.target.value)
                setStation('')
              }}
            >
              <option value="">すべての地域</option>
              {areas.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor={`${id}-station`}>駅・出口</Label>
            <select
              id={`${id}-station`}
              aria-label={`${label}の駅・出口`}
              className={className}
              value={station}
              disabled={disabled}
              onChange={(event) => setStation(event.target.value)}
            >
              <option value="">すべての駅・出口</option>
              {stations.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        aria-label={label}
        className={className}
        value={selected?.id ?? ''}
        disabled={disabled}
        onChange={(event) =>
          onChange(hotels.find((hotel) => hotel.id === event.target.value)?.hotelName ?? '')
        }
      >
        <option value="">直接入力</option>
        {selected && !filtered.includes(selected) ? (
          <option value={selected.id}>{formatHotelOptionLabel(selected)}（選択中）</option>
        ) : null}
        {filtered.map((hotel) => (
          <option key={hotel.id} value={hotel.id}>
            {formatHotelOptionLabel(hotel)}
          </option>
        ))}
      </select>
    </div>
  )
}

'use client'

import { useCallback, useEffect, useState } from 'react'
import { shouldUseMockFallbacks } from '@/lib/config/feature-flags'
import { useStore } from '@/contexts/store-context'

export interface LocationArea {
  id: string
  name: string
  prefecture?: string | null
  city?: string | null
  description?: string | null
}

export interface LocationStation {
  id: string
  name: string
  line?: string | null
  areaId?: string | null
  transportationFee?: number | null
  travelTime?: number | null
  description?: string | null
}

interface LocationResponse {
  areas: LocationArea[]
  stations: LocationStation[]
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

const fallbackAreas: LocationArea[] = [
  {
    id: 'fallback-shibuya',
    name: '渋谷エリア',
    prefecture: '東京都',
    city: '渋谷区',
    description: '渋谷駅周辺および表参道・原宿エリア',
  },
  {
    id: 'fallback-shinjuku',
    name: '新宿エリア',
    prefecture: '東京都',
    city: '新宿区',
    description: '歌舞伎町・西新宿・東新宿エリア',
  },
  {
    id: 'fallback-ikebukuro',
    name: '池袋エリア',
    prefecture: '東京都',
    city: '豊島区',
    description: '池袋駅東口・西口エリア',
  },
]

const fallbackStations: LocationStation[] = [
  {
    id: 'fallback-station-shibuya',
    name: '渋谷駅',
    line: 'JR山手線',
    areaId: 'fallback-shibuya',
    transportationFee: 0,
    travelTime: 10,
  },
  {
    id: 'fallback-station-shinjuku',
    name: '新宿駅',
    line: 'JR山手線',
    areaId: 'fallback-shinjuku',
    transportationFee: 1000,
    travelTime: 20,
  },
  {
    id: 'fallback-station-ikebukuro',
    name: '池袋駅',
    line: 'JR山手線',
    areaId: 'fallback-ikebukuro',
    transportationFee: 1500,
    travelTime: 25,
  },
]

export function useLocations(): LocationResponse {
  const [areas, setAreas] = useState<LocationArea[]>([])
  const [stations, setStations] = useState<LocationStation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { currentStore } = useStore()

  const fetchLocations = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (currentStore?.id) {
        params.set('storeId', currentStore.id)
      }

      const areaResponse = await fetch(
        `/api/settings/area${params.toString() ? `?${params.toString()}` : ''}`,
        {
        credentials: 'include',
        cache: 'no-store',
        }
      )

      if (!areaResponse.ok) {
        throw new Error(await areaResponse.text())
      }

      const payload = await areaResponse.json()
      const areaData = Array.isArray(payload?.data) ? payload.data : payload
      const flattenedAreas: LocationArea[] = Array.isArray(areaData) ? areaData : []

      const stationData: LocationStation[] = []
      flattenedAreas.forEach((area) => {
        if (Array.isArray(area?.stations)) {
          area.stations.forEach((station: any) => {
            stationData.push({
              id: station.id,
              name: station.name,
              line: station.line,
              areaId: station.areaId ?? area.id,
              transportationFee: station.transportationFee ?? 0,
              travelTime: station.travelTime ?? 0,
              description: station.description,
            })
          })
        }
      })

      setAreas(
        flattenedAreas.map((area) => ({
          id: area.id,
          name: area.name,
          prefecture: area.prefecture,
          city: area.city,
          description: area.description,
        }))
      )
      setStations(stationData)
    } catch (err) {
      console.error('Failed to load area/station data:', err)
      setError(err as Error)
      if (shouldUseMockFallbacks()) {
        setAreas(fallbackAreas)
        setStations(fallbackStations)
      } else {
        setAreas([])
        setStations([])
      }
    } finally {
      setLoading(false)
    }
  }, [currentStore?.id])

  useEffect(() => {
    fetchLocations()
  }, [fetchLocations])

  return {
    areas,
    stations,
    loading,
    error,
    refresh: fetchLocations,
  }
}

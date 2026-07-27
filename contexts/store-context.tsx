/**
 * @design_doc   Multi-store administrator navigation authorization
 * @related_to   app/api/admin/stores/route.ts and lib/store/admin-stores.ts enforce administrator scope
 * @known_issues Public non-admin routes retain the static compatibility catalogue in this outer context
 */
'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { Store, StoreConfig } from '@/lib/store/types'
import { getActiveStores } from '@/lib/store/data'
import { useSession } from 'next-auth/react'
import { filterAdminStores } from '@/lib/store/admin-stores'

interface StoreContextType extends StoreConfig {
  switchStore: (storeCode: string) => void
  isLoading: boolean
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

type SerializedStore = Omit<Store, 'createdAt' | 'updatedAt'> & {
  createdAt: string
  updatedAt: string
}

function parseCatalogStores(payload: unknown): Store[] {
  if (!payload || typeof payload !== 'object' || !('stores' in payload)) {
    return []
  }

  const records = (payload as { stores?: unknown }).stores
  if (!Array.isArray(records)) {
    return []
  }

  return records.flatMap((record) => {
    if (
      !record ||
      typeof record !== 'object' ||
      !('id' in record) ||
      !('slug' in record) ||
      !('createdAt' in record) ||
      !('updatedAt' in record)
    ) {
      return []
    }

    const serialized = record as SerializedStore
    if (typeof serialized.id !== 'string' || typeof serialized.slug !== 'string') {
      return []
    }
    const createdAt = new Date(serialized.createdAt)
    const updatedAt = new Date(serialized.updatedAt)
    if (Number.isNaN(createdAt.getTime()) || Number.isNaN(updatedAt.getTime())) {
      return []
    }

    return [{ ...serialized, createdAt, updatedAt }]
  })
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status: sessionStatus } = useSession()
  const [config, setConfig] = useState<StoreConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    const initializeStore = async () => {
      // 本番環境では window.location.hostname からサブドメインを取得
      // 開発環境では localStorage またはクエリパラメータから店舗を決定
      let storeCode = 'ikebukuro' // デフォルト店舗

      if (typeof window !== 'undefined') {
        // サブドメインから店舗を判定
        const hostname = window.location.hostname
        const subdomain = hostname.split('.')[0]

        // 開発環境の場合はクエリパラメータもチェック
        const urlParams = new URLSearchParams(window.location.search)
        const storeParam = urlParams.get('store')

        if (storeParam) {
          storeCode = storeParam
        } else if (subdomain && subdomain !== 'localhost' && subdomain !== 'www') {
          storeCode = subdomain
        } else {
          // localStorage から前回選択した店舗を取得
          const savedStore = localStorage.getItem('selectedStore')
          if (savedStore) {
            storeCode = savedStore
          }
        }
      }

      const isAdmin = session?.user?.role === 'admin'
      let allActiveStores: Store[]
      if (isAdmin) {
        try {
          const response = await fetch('/api/admin/stores', {
            cache: 'no-store',
            credentials: 'include',
          })
          if (!response.ok) {
            throw new Error('ADMIN_STORE_CATALOG_REJECTED')
          }
          allActiveStores = parseCatalogStores(await response.json()).filter(
            (store) => store.isActive
          )
        } catch {
          if (active) {
            setConfig(null)
            setIsLoading(false)
          }
          return
        }
      } else {
        allActiveStores = getActiveStores()
      }

      const availableStores = isAdmin
        ? filterAdminStores(allActiveStores, session.user)
        : allActiveStores
      const currentStore = availableStores.find(
        (store) => store.id === storeCode || store.slug === storeCode
      )
      const isSuperAdmin =
        session?.user?.adminRole === 'super_admin' ||
        Boolean(session?.user?.permissions?.includes('*'))

      if (!active) return

      if (currentStore) {
        setConfig({
          currentStore,
          availableStores,
          isSuperAdmin,
        })
      } else {
        // フォールバック: 最初の店舗を使用
        const fallbackStore = availableStores[0]
        if (fallbackStore) {
          setConfig({
            currentStore: fallbackStore,
            availableStores,
            isSuperAdmin,
          })
        } else {
          setConfig(null)
        }
      }

      setIsLoading(false)
    }

    if (sessionStatus !== 'loading') {
      setIsLoading(true)
      void initializeStore()
    }

    return () => {
      active = false
    }
  }, [session, sessionStatus])

  const switchStore = (storeCode: string) => {
    const newStore = config?.availableStores.find(
      (store) => store.id === storeCode || store.slug === storeCode
    )
    if (newStore && config) {
      setConfig({
        ...config,
        currentStore: newStore,
      })

      // localStorage に保存
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedStore', storeCode)
      }
    }
  }

  if (isLoading) {
    return <div>店舗情報を読み込み中...</div>
  }

  if (!config) {
    return <div>このアカウントに利用可能な店舗が割り当てられていません。</div>
  }

  return (
    <StoreContext.Provider
      value={{
        ...config,
        switchStore,
        isLoading,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}

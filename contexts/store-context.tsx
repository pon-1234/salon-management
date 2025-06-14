"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { Store, StoreConfig } from '@/lib/store/types'
import { getStoreBySlug, getActiveStores } from '@/lib/store/data'

interface StoreContextType extends StoreConfig {
  switchStore: (storeCode: string) => void
  isLoading: boolean
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<StoreConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initializeStore = () => {
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

      const currentStore = getStoreBySlug(storeCode)
      const availableStores = getActiveStores()

      if (currentStore) {
        setConfig({
          currentStore,
          availableStores,
          isSuperAdmin: true // 実際の実装では認証情報から判定
        })
      } else {
        // フォールバック: 最初の店舗を使用
        const fallbackStore = availableStores[0]
        if (fallbackStore) {
          setConfig({
            currentStore: fallbackStore,
            availableStores,
            isSuperAdmin: true
          })
        }
      }

      setIsLoading(false)
    }

    initializeStore()
  }, [])

  const switchStore = (storeCode: string) => {
    const newStore = getStoreBySlug(storeCode)
    if (newStore && config) {
      setConfig({
        ...config,
        currentStore: newStore
      })
      
      // localStorage に保存
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedStore', storeCode)
      }
    }
  }

  if (isLoading || !config) {
    return <div>店舗情報を読み込み中...</div>
  }

  return (
    <StoreContext.Provider value={{
      ...config,
      switchStore,
      isLoading
    }}>
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
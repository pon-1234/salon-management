'use client'

import { createContext, useContext } from 'react'
import { Store } from '@/lib/store/types'

interface StoreContextType {
  store: Store
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

export function StoreProvider({ children, store }: { children: React.ReactNode; store: Store }) {
  return <StoreContext.Provider value={{ store }}>{children}</StoreContext.Provider>
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context.store
}

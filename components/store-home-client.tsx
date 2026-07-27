import { Store } from '@/lib/store/types'
import { StoreHomeContent } from '@/components/store-home-content'
import type { PublicStoreHomeData } from '@/lib/store/public-types'

interface StoreHomeClientProps {
  store: Store
  initialData: PublicStoreHomeData | null
}

export function StoreHomeClient({ store, initialData }: StoreHomeClientProps) {
  return <StoreHomeContent store={store} data={initialData} />
}

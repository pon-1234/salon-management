"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, CheckCircle, AlertCircle, Clock } from "lucide-react"
import { getPricingUseCases, PricingSyncStatus } from "@/lib/pricing"
import { useToast } from "@/hooks/use-toast"
import { formatDistanceToNow } from "date-fns"
import { ja } from "date-fns/locale"

interface PricingSyncStatusCardProps {
  storeId: string
  storeName: string
}

export function PricingSyncStatusCard({ storeId, storeName }: PricingSyncStatusCardProps) {
  const [syncStatus, setSyncStatus] = useState<PricingSyncStatus | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  
  const pricingUseCases = getPricingUseCases()

  useEffect(() => {
    loadSyncStatus()
  }, [storeId])

  const loadSyncStatus = async () => {
    try {
      setLoading(true)
      const status = await pricingUseCases.getSyncStatus(storeId)
      setSyncStatus(status)
    } catch (error) {
      toast({
        title: "エラー",
        description: "同期状態の取得に失敗しました",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      await pricingUseCases.syncPricing(storeId)
      await loadSyncStatus()
      toast({
        title: "同期完了",
        description: `${storeName}の料金情報が同期されました`,
      })
    } catch (error) {
      toast({
        title: "エラー",
        description: "同期に失敗しました",
        variant: "destructive",
      })
    } finally {
      setSyncing(false)
    }
  }

  if (loading || !syncStatus) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          {storeName}
          <Button
            size="sm"
            variant="outline"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            同期
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">状態</span>
            {syncStatus.isSynced ? (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle className="w-3 h-3 mr-1" />
                同期済み
              </Badge>
            ) : (
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                <AlertCircle className="w-3 h-3 mr-1" />
                未同期 ({syncStatus.pendingChanges}件)
              </Badge>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">最終同期</span>
            <div className="flex items-center text-sm">
              <Clock className="w-3 h-3 mr-1 text-gray-400" />
              {formatDistanceToNow(new Date(syncStatus.lastSyncedAt), { 
                addSuffix: true,
                locale: ja 
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface AllStoresSyncStatusProps {
  stores: Array<{ id: string; name: string }>
}

export function AllStoresSyncStatus({ stores }: AllStoresSyncStatusProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">店舗別同期状態</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stores.map((store) => (
          <PricingSyncStatusCard
            key={store.id}
            storeId={store.id}
            storeName={store.name}
          />
        ))}
      </div>
    </div>
  )
}
import { ModificationHistory, ModificationAlert } from "@/lib/types/modification-history"

// モック修正履歴データ
export const mockModificationHistory: ModificationHistory[] = [
  {
    id: "mod_001",
    reservationId: "res_001",
    modifiedBy: "user_admin",
    modifiedByName: "管理者 太郎",
    modificationDate: new Date("2024-12-10T14:30:00"),
    modificationType: "price",
    fieldChanged: "総額",
    oldValue: "15,000円",
    newValue: "16,000円",
    reason: "追加オプション料金",
    ipAddress: "192.168.1.100",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    sessionId: "sess_abc123"
  },
  {
    id: "mod_002", 
    reservationId: "res_001",
    modifiedBy: "user_staff",
    modifiedByName: "スタッフ 花子",
    modificationDate: new Date("2024-12-10T13:15:00"),
    modificationType: "time",
    fieldChanged: "開始時間",
    oldValue: "14:00",
    newValue: "14:30",
    reason: "顧客都合による時間変更",
    ipAddress: "192.168.1.101",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    sessionId: "sess_def456"
  },
  {
    id: "mod_003",
    reservationId: "res_001", 
    modifiedBy: "user_manager",
    modifiedByName: "店長 次郎",
    modificationDate: new Date("2024-12-10T12:00:00"),
    modificationType: "staff",
    fieldChanged: "担当スタッフ",
    oldValue: "田中美香",
    newValue: "佐藤由美",
    reason: "スタッフ体調不良による変更",
    ipAddress: "192.168.1.102",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    sessionId: "sess_ghi789"
  }
]

// モックアラートデータ
export const mockModificationAlerts: ModificationAlert[] = [
  {
    id: "alert_001",
    reservationId: "res_001",
    alertType: "large_price_change",
    severity: "high",
    message: "24時間以内に料金が20%以上変更されました（15,000円 → 16,000円）",
    triggeredAt: new Date("2024-12-10T14:30:00"),
    resolved: false
  },
  {
    id: "alert_002",
    reservationId: "res_001", 
    alertType: "frequent_modifications",
    severity: "medium",
    message: "この予約は24時間以内に3回修正されています",
    triggeredAt: new Date("2024-12-10T14:30:00"),
    resolved: false
  }
]

// 修正履歴記録機能
export function recordModification(
  reservationId: string,
  modifiedBy: string,
  modifiedByName: string,
  modificationType: ModificationHistory['modificationType'],
  fieldChanged: string,
  oldValue: string,
  newValue: string,
  reason: string,
  ipAddress?: string,
  userAgent?: string,
  sessionId?: string
): ModificationHistory {
  const modification: ModificationHistory = {
    id: `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    reservationId,
    modifiedBy,
    modifiedByName,
    modificationDate: new Date(),
    modificationType,
    fieldChanged,
    oldValue,
    newValue,
    reason,
    ipAddress,
    userAgent,
    sessionId
  }

  // 実際のアプリケーションではここでデータベースに保存
  mockModificationHistory.unshift(modification)
  
  // アラート生成チェック
  checkAndGenerateAlerts(reservationId, modification)
  
  return modification
}

// アラート生成チェック
function checkAndGenerateAlerts(reservationId: string, modification: ModificationHistory) {
  const reservationModifications = mockModificationHistory.filter(
    mod => mod.reservationId === reservationId
  )

  // 頻繁な修正のチェック（24時間以内に3回以上）
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recentModifications = reservationModifications.filter(
    mod => mod.modificationDate >= last24Hours
  )

  if (recentModifications.length >= 3) {
    const alert: ModificationAlert = {
      id: `alert_${Date.now()}_freq`,
      reservationId,
      alertType: "frequent_modifications",
      severity: "medium",
      message: `この予約は24時間以内に${recentModifications.length}回修正されています`,
      triggeredAt: new Date(),
      resolved: false
    }
    mockModificationAlerts.unshift(alert)
  }

  // 大幅な料金変更のチェック
  if (modification.modificationType === 'price') {
    const oldPrice = parseFloat(modification.oldValue.replace(/[^0-9]/g, ''))
    const newPrice = parseFloat(modification.newValue.replace(/[^0-9]/g, ''))
    const changePercent = Math.abs((newPrice - oldPrice) / oldPrice) * 100

    if (changePercent >= 20) {
      const alert: ModificationAlert = {
        id: `alert_${Date.now()}_price`,
        reservationId,
        alertType: "large_price_change",
        severity: changePercent >= 50 ? "critical" : "high",
        message: `24時間以内に料金が${changePercent.toFixed(1)}%変更されました（${modification.oldValue} → ${modification.newValue}）`,
        triggeredAt: new Date(),
        resolved: false
      }
      mockModificationAlerts.unshift(alert)
    }
  }
}

// 履歴取得機能
export function getModificationHistory(reservationId: string): ModificationHistory[] {
  return mockModificationHistory
    .filter(mod => mod.reservationId === reservationId)
    .sort((a, b) => b.modificationDate.getTime() - a.modificationDate.getTime())
}

// アラート取得機能
export function getModificationAlerts(reservationId: string): ModificationAlert[] {
  return mockModificationAlerts
    .filter(alert => alert.reservationId === reservationId)
    .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())
}
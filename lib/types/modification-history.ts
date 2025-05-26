export interface ModificationHistory {
  id: string;
  reservationId: string;
  modifiedBy: string; // ユーザーID
  modifiedByName: string; // ユーザー名
  modificationDate: Date;
  modificationType: 'price' | 'time' | 'staff' | 'course' | 'options' | 'status' | 'other';
  fieldChanged: string; // 変更されたフィールド名
  oldValue: string; // 変更前の値
  newValue: string; // 変更後の値
  reason: string; // 修正理由
  ipAddress?: string; // 修正時のIPアドレス
  userAgent?: string; // 修正時のユーザーエージェント
  sessionId?: string; // セッションID
  approvedBy?: string; // 承認者ID（承認制の場合）
  approvedAt?: Date; // 承認日時
}

export interface ModificationSummary {
  totalModifications: number;
  priceChanges: number;
  totalPriceIncrease: number;
  totalPriceDecrease: number;
  lastModification: Date;
  modificationsByUser: Record<string, number>;
}

export interface ModificationAlert {
  id: string;
  reservationId: string;
  alertType: 'large_price_change' | 'frequent_modifications' | 'suspicious_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  triggeredAt: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}
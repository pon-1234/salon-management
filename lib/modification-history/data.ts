import { ModificationHistory, ModificationAlert } from '@/lib/types/modification-history';

// Mock data for modification history
const modificationHistoryData: ModificationHistory[] = [
  {
    id: '1',
    reservationId: '1',
    userId: 'user_001',
    userName: '管理者',
    fieldName: 'status',
    fieldDisplayName: 'ステータス',
    oldValue: 'confirmed',
    newValue: 'modifiable',
    reason: '顧客からの変更要請',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    sessionId: 'session_12345',
    timestamp: new Date('2024-01-15T10:30:00Z'),
  },
  {
    id: '2',
    reservationId: '1',
    userId: 'user_001',
    userName: '管理者',
    fieldName: 'staff',
    fieldDisplayName: 'スタッフ',
    oldValue: 'スタッフA',
    newValue: 'スタッフB',
    reason: 'スタッフの都合により変更',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    sessionId: 'session_12345',
    timestamp: new Date('2024-01-15T11:00:00Z'),
  }
];

const modificationAlertsData: ModificationAlert[] = [
  {
    id: 'alert_1',
    reservationId: '1',
    type: 'warning',
    message: '修正可能期限まで残り15分です',
    timestamp: new Date('2024-01-15T11:45:00Z'),
    isRead: false,
  },
  {
    id: 'alert_2',
    reservationId: '1',
    type: 'info',
    message: 'スタッフが変更されました',
    timestamp: new Date('2024-01-15T11:00:00Z'),
    isRead: true,
  }
];

export function getModificationHistory(reservationId: string): ModificationHistory[] {
  return modificationHistoryData.filter(history => history.reservationId === reservationId);
}

export function getModificationAlerts(reservationId: string): ModificationAlert[] {
  return modificationAlertsData.filter(alert => alert.reservationId === reservationId);
}

export function recordModification(
  reservationId: string,
  userId: string,
  userName: string,
  fieldName: string,
  fieldDisplayName: string,
  oldValue: any,
  newValue: any,
  reason: string,
  ipAddress: string,
  userAgent: string,
  sessionId: string
): void {
  const newModification: ModificationHistory = {
    id: `mod_${Date.now()}`,
    reservationId,
    userId,
    userName,
    fieldName,
    fieldDisplayName,
    oldValue,
    newValue,
    reason,
    ipAddress,
    userAgent,
    sessionId,
    timestamp: new Date(),
  };
  
  modificationHistoryData.push(newModification);
  
  // Add alert if needed
  if (fieldName === 'status' && newValue === 'modifiable') {
    const alert: ModificationAlert = {
      id: `alert_${Date.now()}`,
      reservationId,
      type: 'info',
      message: '予約が修正可能状態に変更されました',
      timestamp: new Date(),
      isRead: false,
    };
    modificationAlertsData.push(alert);
  }
}
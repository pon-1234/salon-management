export interface ModificationHistory {
  id: string;
  reservationId: string;
  userId: string;
  userName: string;
  fieldName: string;
  fieldDisplayName: string;
  oldValue: any;
  newValue: any;
  reason: string;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  timestamp: Date;
}

export interface ModificationAlert {
  id: string;
  reservationId: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: Date;
  isRead: boolean;
}
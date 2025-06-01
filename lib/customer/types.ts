import { BaseEntity } from '../shared';

export interface Customer extends BaseEntity {
  name: string;
  nameKana?: string;
  phone: string;
  email: string;
  password: string;
  birthDate: Date;
  age: number;
  memberType: 'regular' | 'vip';
  smsEnabled: boolean;
  points: number;
  registrationDate: Date;
  lastLoginDate?: Date;
  lastVisitDate?: Date;
  notes?: string;
}

export interface CustomerUsageRecord {
  id: string;
  date: Date;
  serviceName: string;
  staffName: string;
  amount: number;
  status: 'completed' | 'cancelled';
}

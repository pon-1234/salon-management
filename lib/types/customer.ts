import { BaseEntity } from '../shared';

export interface Customer extends BaseEntity {
  name: string;
  nameKana: string;
  phone: string;
  email: string;
  birthDate: Date;
  memberType: 'regular' | 'vip';
  smsEnabled: boolean;
  points: number;
  lastVisitDate?: Date;
  notes?: string;
}

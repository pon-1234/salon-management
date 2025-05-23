export interface Customer {
  id: string;
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

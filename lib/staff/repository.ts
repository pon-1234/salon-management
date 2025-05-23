import { Staff, StaffSchedule } from './types';

export interface StaffRepository {
  getStaff(id: string): Promise<Staff | null>;
  getAllStaff(): Promise<Staff[]>;
  createStaff(staff: Omit<Staff, 'id'>): Promise<Staff>;
  updateStaff(id: string, staff: Partial<Staff>): Promise<Staff>;
  deleteStaff(id: string): Promise<void>;
  getStaffSchedule(staffId: string, startDate: Date, endDate: Date): Promise<StaffSchedule[]>;
  updateStaffSchedule(staffId: string, schedule: StaffSchedule[]): Promise<void>;
}

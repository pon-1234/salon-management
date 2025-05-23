import { Staff, StaffSchedule } from './types';
import { StaffRepository } from './repository';

export class StaffUseCases {
  constructor(private repository: StaffRepository) {}

  async getStaff(id: string): Promise<Staff | null> {
    return this.repository.getStaff(id);
  }

  async getAllStaff(): Promise<Staff[]> {
    return this.repository.getAllStaff();
  }

  async createStaff(staff: Omit<Staff, 'id'>): Promise<Staff> {
    return this.repository.createStaff(staff);
  }

  async updateStaff(id: string, staff: Partial<Staff>): Promise<Staff> {
    return this.repository.updateStaff(id, staff);
  }

  async deleteStaff(id: string): Promise<void> {
    return this.repository.deleteStaff(id);
  }

  async getStaffSchedule(staffId: string, startDate: Date, endDate: Date): Promise<StaffSchedule[]> {
    return this.repository.getStaffSchedule(staffId, startDate, endDate);
  }

  async updateStaffSchedule(staffId: string, schedule: StaffSchedule[]): Promise<void> {
    return this.repository.updateStaffSchedule(staffId, schedule);
  }
}

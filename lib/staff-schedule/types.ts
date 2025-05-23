export interface StaffScheduleStatus {
  type: "休日" | "出勤予定" | "未入力";
  startTime?: string;
  endTime?: string;
  note?: string;
}

export interface StaffScheduleEntry {
  staffId: string;
  name: string;
  nameKana: string;
  age: number;
  image: string;
  hasPhone: boolean;
  hasBusinessContact: boolean;
  schedule: {
    [date: string]: StaffScheduleStatus;
  };
}

export interface WeeklySchedule {
  startDate: Date;
  endDate: Date;
  entries: StaffScheduleEntry[];
  stats: {
    totalStaff: number;
    workingStaff: number;
    averageWorkingHours: number;
    averageWorkingStaff: number;
  };
}

export interface ScheduleFilters {
  date: Date;
  staffFilter: string;
}

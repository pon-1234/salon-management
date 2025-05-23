import { StaffScheduleEntry, WeeklySchedule } from './types';

export function generateMockWeeklySchedule(startDate: Date): WeeklySchedule {
  const mockEntries: StaffScheduleEntry[] = [
    {
      staffId: "1",
      name: "あい",
      nameKana: "あい",
      age: 27,
      image: "/placeholder.svg?height=150&width=150",
      hasPhone: true,
      hasBusinessContact: true,
      schedule: {
        "2024-12-11": { type: "休日" },
        "2024-12-12": { type: "休日" },
        "2024-12-13": { type: "休日" },
        "2024-12-14": { type: "出勤予定", startTime: "10:00", endTime: "15:00" },
        "2024-12-15": { type: "休日" },
        "2024-12-16": { type: "出勤予定", startTime: "10:00", endTime: "15:00" },
        "2024-12-17": { type: "休日" },
      }
    },
    {
      staffId: "2",
      name: "あやみ",
      nameKana: "あやみ",
      age: 27,
      image: "/placeholder.svg?height=150&width=150",
      hasPhone: true,
      hasBusinessContact: true,
      schedule: {
        "2024-12-11": { type: "休日" },
        "2024-12-12": { type: "休日" },
        "2024-12-13": { type: "休日", note: "※休みに変更" },
        "2024-12-14": { type: "休日" },
        "2024-12-15": { type: "出勤予定", startTime: "17:30", endTime: "23:00", note: "※来週出勤（17：30〜22：45分）" },
        "2024-12-16": { type: "未入力" },
        "2024-12-17": { type: "未入力" },
      }
    },
    {
      staffId: "3",
      name: "いずみ",
      nameKana: "いずみ",
      age: 32,
      image: "/placeholder.svg?height=150&width=150",
      hasPhone: true,
      hasBusinessContact: true,
      schedule: {
        "2024-12-11": { type: "休日" },
        "2024-12-12": { type: "出勤予定", startTime: "15:00", endTime: "24:00" },
        "2024-12-13": { type: "休日" },
        "2024-12-14": { type: "出勤予定", startTime: "15:00", endTime: "24:00" },
        "2024-12-15": { type: "休日" },
        "2024-12-16": { type: "出勤予定", startTime: "15:00", endTime: "24:00" },
        "2024-12-17": { type: "休日" },
      }
    },
  ];

  const workingStaff = mockEntries.length;
  const totalHours = mockEntries.reduce((acc, entry) => {
    const workingDays = Object.values(entry.schedule).filter(
      s => s.type === "出勤予定"
    ).length;
    return acc + (workingDays * 8); // Assuming 8 hours per working day
  }, 0);

  return {
    startDate,
    endDate: new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000),
    entries: mockEntries,
    stats: {
      totalStaff: 32,
      workingStaff: 14,
      averageWorkingHours: 23.9,
      averageWorkingStaff: 11,
    }
  };
}

import { CastScheduleEntry, WeeklySchedule } from './types';
import { format, addDays } from 'date-fns';

export function generateMockWeeklySchedule(startDate: Date): WeeklySchedule {
  // Generate dates for the week (Monday to Sunday)
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(startDate, i);
    return format(date, 'yyyy-MM-dd');
  });

  const mockEntries: CastScheduleEntry[] = [
    {
      castId: "1",
      name: "あい",
      nameKana: "あい",
      age: 27,
      image: "/placeholder-user.jpg",
      hasPhone: true,
      hasBusinessContact: true,
      schedule: {
        [weekDates[0]]: { type: "休日" },
        [weekDates[1]]: { type: "出勤予定", startTime: "12:00", endTime: "18:00" },
        [weekDates[2]]: { type: "出勤予定", startTime: "14:00", endTime: "22:00" },
        [weekDates[3]]: { type: "出勤予定", startTime: "10:00", endTime: "15:00" },
        [weekDates[4]]: { type: "休日" },
        [weekDates[5]]: { type: "出勤予定", startTime: "16:00", endTime: "24:00" },
        [weekDates[6]]: { type: "出勤予定", startTime: "18:00", endTime: "01:00", note: "遅番シフト" },
      }
    },
    {
      castId: "2",
      name: "あやみ",
      nameKana: "あやみ",
      age: 27,
      image: "/placeholder-user.jpg",
      hasPhone: true,
      hasBusinessContact: true,
      schedule: {
        [weekDates[0]]: { type: "休日" },
        [weekDates[1]]: { type: "休日" },
        [weekDates[2]]: { type: "休日", note: "※休みに変更" },
        [weekDates[3]]: { type: "出勤予定", startTime: "20:00", endTime: "02:00" },
        [weekDates[4]]: { type: "出勤予定", startTime: "17:30", endTime: "23:00", note: "※来週出勤（17：30〜22：45分）" },
        [weekDates[5]]: { type: "出勤予定", startTime: "19:00", endTime: "01:00" },
        [weekDates[6]]: { type: "未入力" },
      }
    },
    {
      castId: "3",
      name: "いずみ",
      nameKana: "いずみ",
      age: 32,
      image: "/placeholder-user.jpg",
      hasPhone: true,
      hasBusinessContact: true,
      schedule: {
        [weekDates[0]]: { type: "出勤予定", startTime: "15:00", endTime: "23:00" },
        [weekDates[1]]: { type: "出勤予定", startTime: "15:00", endTime: "24:00" },
        [weekDates[2]]: { type: "休日" },
        [weekDates[3]]: { type: "出勤予定", startTime: "15:00", endTime: "24:00" },
        [weekDates[4]]: { type: "休日" },
        [weekDates[5]]: { type: "出勤予定", startTime: "15:00", endTime: "24:00" },
        [weekDates[6]]: { type: "休日" },
      }
    },
    {
      castId: "4",
      name: "えみか",
      nameKana: "えみか",
      age: 24,
      image: "/placeholder-user.jpg",
      hasPhone: false,
      hasBusinessContact: true,
      schedule: {
        [weekDates[0]]: { type: "出勤予定", startTime: "11:00", endTime: "17:00", note: "昼シフト" },
        [weekDates[1]]: { type: "出勤予定", startTime: "11:00", endTime: "17:00" },
        [weekDates[2]]: { type: "出勤予定", startTime: "14:00", endTime: "20:00" },
        [weekDates[3]]: { type: "休日" },
        [weekDates[4]]: { type: "出勤予定", startTime: "18:00", endTime: "24:00" },
        [weekDates[5]]: { type: "出勤予定", startTime: "20:00", endTime: "02:00" },
        [weekDates[6]]: { type: "休日" },
      }
    },
    {
      castId: "5",
      name: "かおり",
      nameKana: "かおり",
      age: 29,
      image: "/placeholder-user.jpg",
      hasPhone: true,
      hasBusinessContact: true,
      schedule: {
        [weekDates[0]]: { type: "未入力" },
        [weekDates[1]]: { type: "出勤予定", startTime: "16:00", endTime: "22:00" },
        [weekDates[2]]: { type: "出勤予定", startTime: "18:00", endTime: "01:00" },
        [weekDates[3]]: { type: "出勤予定", startTime: "20:00", endTime: "03:00" },
        [weekDates[4]]: { type: "休日" },
        [weekDates[5]]: { type: "休日" },
        [weekDates[6]]: { type: "出勤予定", startTime: "19:00", endTime: "02:00" },
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
      totalCast: 32,
      workingCast: 14,
      averageWorkingHours: 68.5,
      averageWorkingCast: 11,
    }
  };
}

import { format, addDays } from 'date-fns';
import { ja } from 'date-fns/locale';

export function getWeekDates(startDate: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
}

export function formatScheduleDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatDisplayDate(date: Date): string {
  return format(date, 'MM/dd', { locale: ja });
}

export function formatDayOfWeek(date: Date): string {
  return format(date, '(E)', { locale: ja });
}

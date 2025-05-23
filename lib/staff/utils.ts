import { Staff, StaffSchedule } from '../types/staff';

export function generateSchedule(staff: Staff, startDate: Date, endDate: Date): StaffSchedule[] {
  const schedule: StaffSchedule[] = [];
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    if (staff.workStart && staff.workEnd) {
      schedule.push({
        staffId: staff.id,
        date: new Date(currentDate),
        startTime: new Date(currentDate.setHours(staff.workStart.getHours(), staff.workStart.getMinutes())),
        endTime: new Date(currentDate.setHours(staff.workEnd.getHours(), staff.workEnd.getMinutes())),
      });
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return schedule;
}

export function calculateStaffPerformance(staff: Staff, reservations: Reservation[]): StaffPerformance {
  const totalReservations = reservations.length;
  const totalRevenue = reservations.reduce((sum, reservation) => sum + reservation.price, 0);
  const averageRating = reservations.reduce((sum, reservation) => sum + (reservation.rating || 0), 0) / totalReservations;

  return {
    totalReservations,
    totalRevenue,
    averageRating,
  };
}

export function getAvailableTimeSlots(staff: Staff, date: Date, existingReservations: Reservation[]): Date[] {
  const availableSlots: Date[] = [];
  const startTime = new Date(date);
  startTime.setHours(staff.workStart?.getHours() || 9, 0, 0, 0);
  const endTime = new Date(date);
  endTime.setHours(staff.workEnd?.getHours() || 18, 0, 0, 0);

  while (startTime < endTime) {
    if (!existingReservations.some(reservation => 
      reservation.startTime <= startTime && reservation.endTime > startTime
    )) {
      availableSlots.push(new Date(startTime));
    }
    startTime.setMinutes(startTime.getMinutes() + 30);
  }

  return availableSlots;
}

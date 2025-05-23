export interface Cast {
  id: string;
  name: string;
  nameKana: string;
  age: number;
  height: number;
  bust: string;
  waist: number;
  hip: number;
  type: string;
  image: string;
  description: string;
  netReservation: boolean;
  specialDesignationFee: number | null;
  regularDesignationFee: number | null;
  workStatus: "出勤" | "未出勤";
  courseTypes: string[];
  workStart?: Date;
  workEnd?: Date;
  appointments: Appointment[]; // appointmentsを追加
}

export interface Appointment { // Appointment型定義を追加
  id: string;
  serviceName: string;
  startTime: Date;
  endTime: Date;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  reservationTime: string;
  status: "provisional" | "confirmed";
  location?: string;
  price: number;
}


export interface CastSchedule {
  castId: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  bookings?: number; // 予約数
}

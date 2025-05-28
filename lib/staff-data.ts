export interface StaffMember {
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
  appointments: Appointment[];
}

export interface Appointment {
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

export interface ScheduleDay {
  date: string;
  day: string;
  time?: string;
  status?: string;
  bookings?: number;
}

export interface Option {
  name: string;
  price: number;
  note?: string;
}

const createDate = (hours: number, minutes: number = 0) => {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

export const staffMembers: StaffMember[] = [
  {
    id: "1",
    name: "みるく",
    nameKana: "みるく",
    age: 20,
    height: 160,
    bust: "G",
    waist: 62,
    hip: 98,
    type: "カワイイ系",
    image: "https://rimane.net/images/tyrano-move-image01.jpg",
    description: "明るく元気な性格で、お客様を楽しませることが得意です。マッサージの技術も高く、リピーターの多いスタッフです。",
    netReservation: true,
    specialDesignationFee: null,
    regularDesignationFee: null,
    workStatus: "出勤",
    courseTypes: ["イベントコース", "基本コース"],
    workStart: createDate(10),
    workEnd: createDate(22),
    appointments: [
      {
        id: "1-1",
        serviceName: "マッサージ施術名",
        startTime: createDate(11),
        endTime: createDate(14),
        customerName: "佐藤 花子",
        customerPhone: "090-9999-9999",
        customerEmail: "satoh_hanako@example.com",
        reservationTime: "12月11日 12:03",
        status: "provisional",
        price: 35000,
      },
      {
        id: "1-2",
        serviceName: "マッサージ施術名",
        startTime: createDate(15),
        endTime: createDate(16, 30),
        customerName: "鈴木 一郎",
        customerPhone: "080-8888-8888",
        customerEmail: "suzuki_ichiro@example.com",
        reservationTime: "12月15日 10:30",
        status: "confirmed",
        price: 35000,
      },
    ],
  },
  {
    id: "2",
    name: "やまだ たろう",
    nameKana: "やまだ たろう",
    age: 25,
    height: 175,
    bust: "C",
    waist: 70,
    hip: 90,
    type: "キレイ系",
    image: "https://rimane.net/images/tyrano-move-image01.jpg",
    description: "落ち着いた雰囲気で、丁寧な接客が好評です。マッサージの腕前も確かで、特にリラックスを求めるお客様に人気があります。",
    netReservation: true,
    specialDesignationFee: 2000,
    regularDesignationFee: 1000,
    workStatus: "出勤",
    courseTypes: ["イベントコース", "基本コース"],
    workStart: createDate(12),
    workEnd: createDate(23),
    appointments: [
      {
        id: "2-1",
        serviceName: "マッサージ施術名",
        startTime: createDate(13),
        endTime: createDate(14, 40),
        customerName: "田中 明",
        customerPhone: "090-7777-7777",
        customerEmail: "tanaka_akira@example.com",
        reservationTime: "12月22日 18:32",
        status: "provisional",
        price: 35000,
      },
      {
        id: "2-2",
        serviceName: "マッサージ施術名",
        startTime: createDate(18),
        endTime: createDate(21),
        customerName: "高橋 誠",
        customerPhone: "090-6666-6666",
        customerEmail: "takahashi_makoto@example.com",
        reservationTime: "12月20日 09:15",
        status: "confirmed",
        price: 35000,
      },
    ],
  },
  {
    id: "3",
    name: "たかはし みか",
    nameKana: "たかはし みか",
    age: 22,
    height: 158,
    bust: "G",
    waist: 58,
    hip: 88,
    type: "ロリ系",
    image: "https://rimane.net/images/tyrano-move-image01.jpg",
    description: "小柄でキュートな外見と、意外な大人の魅力を併せ持つスタッフです。細やかな気配りが得意で、初めてのお客様にも安心して利用いただけます。",
    netReservation: true,
    specialDesignationFee: 3000,
    regularDesignationFee: 1500,
    workStatus: "未出勤",
    courseTypes: ["基本コース"],
    workStart: createDate(14),
    workEnd: createDate(22),
    appointments: [
      {
        id: "3-1",
        serviceName: "マッサージ施術名",
        startTime: createDate(15),
        endTime: createDate(16, 30),
        customerName: "小林 さくら",
        customerPhone: "090-5555-5555",
        customerEmail: "kobayashi_sakura@example.com",
        reservationTime: "12月18日 14:45",
        status: "confirmed",
        price: 35000,
      },
      {
        id: "3-2",
        serviceName: "マッサージ施術名",
        startTime: createDate(20),
        endTime: createDate(21, 30),
        customerName: "渡辺 健太",
        customerPhone: "090-4444-4444",
        customerEmail: "watanabe_kenta@example.com",
        reservationTime: "12月23日 11:20",
        status: "provisional",
        price: 35000,
      },
    ],
  },
];

// Import options from the centralized location
export { options } from "./course-option-data";

export function generateSchedule(staff: StaffMember): ScheduleDay[] {
  const today = new Date();
  return Array.from({ length: 11 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const day = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
    const dateString = `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
    
    if (i === 2) {
      return { date: dateString, day, status: "休み" };
    } else if (i >= 7) {
      return { date: dateString, day, status: "未設定" };
    } else {
      const bookings = staff.appointments.filter(a => a.startTime.toDateString() === date.toDateString()).length;
      return {
        date: dateString,
        day,
        time: `${staff.workStart?.getHours().toString().padStart(2, '0')}:00 - ${staff.workEnd?.getHours().toString().padStart(2, '0')}:00`,
        status: bookings > 0 ? "予約" : undefined,
        bookings: bookings > 0 ? bookings : undefined
      };
    }
  });
}

export const schedule: ScheduleDay[] = [
  { date: "2024/12/09", day: "月", time: "16:00 - 00:00", status: "予約", bookings: 1 },
  { date: "2024/12/10", day: "火", time: "16:00 - 00:00" },
  { date: "2024/12/11", day: "水", status: "休み" },
  { date: "2024/12/12", day: "木", time: "16:00 - 00:00" },
  { date: "2024/12/13", day: "金", time: "16:00 - 00:00" },
  { date: "2024/12/14", day: "土", time: "16:00 - 00:00" },
  { date: "2024/12/15", day: "日", time: "16:00 - 00:00" },
  { date: "2024/12/16", day: "月", status: "未設定" },
  { date: "2024/12/17", day: "火", status: "未設定" },
  { date: "2024/12/18", day: "水", status: "未設定" },
  { date: "2024/12/19", day: "木", status: "未設定" },
];

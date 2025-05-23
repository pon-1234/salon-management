export interface Staff {
  id: string
  name: string
  nameKana: string
  age: number
  height: number
  bust: string
  waist: number
  hip: number
  type: string
  image: string
  description: string
  netReservation: boolean
  specialDesignationFee: number | null
  regularDesignationFee: number | null
  workStatus: string
  courseTypes: string[]
  workStart: Date | null
  workEnd: Date | null
  appointments: Appointment[]
}

export interface StaffMember {
  id: string
  name: string
  nameKana: string
  image?: string
  workStatus: string
  workStart?: Date
  workEnd?: Date
}

export interface Appointment {
  id: string
  customerId: string
  customerName: string
  startTime: Date
  endTime: Date
  courseType: string
  status: string
}

export interface StaffSchedule {
  staffId: string
  date: Date
  startTime: Date
  endTime: Date
  bookings: number
}

export interface ScheduleDay {
  date: Date
  isWorking: boolean
  shifts: {
    start: Date
    end: Date
  }[]
}

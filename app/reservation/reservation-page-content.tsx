"use client"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from "@/components/header"
import { DateNavigation } from "@/components/reservation/date-navigation"
import { ActionButtons } from "@/components/reservation/action-buttons"
import { Timeline } from "@/components/reservation/timeline"
import { ReservationList } from "@/components/reservation/reservation-list"
import { ViewToggle } from "@/components/reservation/view-toggle"
import { FilterDialog, FilterOptions } from "@/components/reservation/filter-dialog"
import { castMembers, Cast, Appointment } from "@/lib/cast/data"
import { getAllReservations } from "@/lib/reservation/data"
import { getCourseById } from '@/lib/course-option/utils'
import { ReservationTable, ReservationData } from "@/components/reservation/reservation-table";
import { format } from 'date-fns'
import { customers as customerList, Customer } from "@/lib/customer/data" // Import customer data
import { ReservationDialog } from '@/components/reservation/reservation-dialog';
import { InfoBar } from "@/components/reservation/info-bar"


// Utility function to check if two dates are on the same day
const isSameDay = (date1: Date, date2: Date) => {
return (
  date1.getFullYear() === date2.getFullYear() &&
  date1.getMonth() === date2.getMonth() &&
  date1.getDate() === date2.getDate()
);
};

export function ReservationPageContent() {
const [castData, setCastData] = useState<Cast[]>(castMembers)
const [selectedDate, setSelectedDate] = useState<Date>(new Date())
const [view, setView] = useState<"timeline" | "list">("timeline")
const [filterDialogOpen, setFilterDialogOpen] = useState(false)
// 1. Fix: Change type to ReservationData | null
const [selectedAppointment, setSelectedAppointment] = useState<ReservationData | null>(null)
const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null) // Update: Changed type to Customer | null

const searchParams = useSearchParams()
const customerId = searchParams.get('customerId')

useEffect(() => {
  if (customerId) {
    const customer = customerList.find(c => c.id === customerId);
    if (customer) {
      setSelectedCustomer(customer);
    }
  }
}, [customerId]);


const fetchData = async () => {
  const allReservations = await getAllReservations();

  // 2. Fix: Log all appointments for debugging
  console.log("Fetched reservations:", allReservations);

  const filteredReservations = allReservations.filter(reservation =>
    isSameDay(new Date(reservation.startTime), selectedDate)
  );

  let updatedCastData = castMembers.map(member => {
    const appointments = filteredReservations
      .filter(reservation => reservation.staffId === member.id)
      .map(reservation => ({
        ...reservation,
        startTime: new Date(reservation.startTime),
        endTime: new Date(reservation.endTime)
      }));

    return { ...member, appointments };
  });

  // Filter out NG casts if a customer is selected
  if (selectedCustomer) {
    const ngCastIds = selectedCustomer.ngCasts?.map(ng => ng.castId) || selectedCustomer.ngCastIds || [];
    updatedCastData = updatedCastData.filter(member => 
      !ngCastIds.includes(member.id)
    );
  }

  setCastData(updatedCastData);
};

useEffect(() => {
  fetchData();
}, [selectedDate, selectedCustomer]);

const handleRefresh = () => {
  fetchData();
};

const handleFilterCharacter = (char: string) => {
  let filtered = [...castMembers]

  // First apply NG cast filtering if customer is selected
  if (selectedCustomer) {
    const ngCastIds = selectedCustomer.ngCasts?.map(ng => ng.castId) || selectedCustomer.ngCastIds || [];
    filtered = filtered.filter(staff => !ngCastIds.includes(staff.id))
  }

  if (char === "全") {
    setCastData(filtered)
    return
  }

  const aRow = ["あ","い","う","え","お"]
  const kaRow = ["か","き","く","け","こ"]
  const saRow = ["さ","し","す","せ","そ"]
  const taRow = ["た","ち","つ","て","と"]
  const naRow = ["な","に","ぬ","ね","の"]
  const haRow = ["は","ひ","ふ","へ","ほ"]
  const maRow = ["ま","み","む","め","も"]
  const yaRow = ["や","ゆ","よ"]
  const raRow = ["ら","り","る","れ","ろ"]
  const waRow = ["わ","を","ん"]

  const rowMap: Record<string, string[]> = {
    "あ": aRow,
    "か": kaRow,
    "さ": saRow,
    "た": taRow,
    "な": naRow,
    "は": haRow,
    "ま": maRow,
    "や": yaRow,
    "ら": raRow,
    "わ": waRow,
  }

  if (char === "その他") {
    filtered = filtered.filter(st => {
      const firstChar = st.nameKana.charAt(0)
      const isOther = !Object.values(rowMap).some(row => row.includes(firstChar))
      return isOther
    })
    setCastData(filtered)
    return
  }

  const targetRow = rowMap[char] || []
  filtered = filtered.filter(st => {
    const firstChar = st.nameKana.charAt(0)
    return targetRow.includes(firstChar)
  })
  setCastData(filtered)
}

const handleFilter = (filters: FilterOptions) => {
  let filtered = [...castMembers]

  // Filter out NG casts if a customer is selected
  if (selectedCustomer) {
    const ngCastIds = selectedCustomer.ngCasts?.map(ng => ng.castId) || selectedCustomer.ngCastIds || [];
    filtered = filtered.filter(staff => !ngCastIds.includes(staff.id))
  }

  // Filter by work status
  if (filters.workStatus !== "すべて") {
    filtered = filtered.filter(staff => staff.workStatus === filters.workStatus)
  }

  // Course type filter removed as courseTypes field is no longer used

  // Filter by name
  if (filters.name) {
    const searchTerm = filters.name.toLowerCase()
    filtered = filtered.filter(staff => 
      staff.name.toLowerCase().includes(searchTerm) ||
      staff.nameKana.toLowerCase().includes(searchTerm)
    )
  }

  // Filter by age range
  if (filters.ageRange) {
    const [min, max] = filters.ageRange.split("-").map(num => parseInt(num))
    filtered = filtered.filter(staff => {
      if (filters.ageRange.includes("以上")) {
        return staff.age >= min
      }
      return staff.age >= min && staff.age <= (max || min)
    })
  }

  // Filter by height range
  if (filters.heightRange) {
    const [min, max] = filters.heightRange.split("-").map(num => parseInt(num))
    filtered = filtered.filter(staff => {
      if (filters.heightRange.includes("以上")) {
        return staff.height >= min
      }
      if (filters.heightRange.includes("以下")) {
        return staff.height <= min
      }
      return staff.height >= min && staff.height <= (max || min)
    })
  }

  // Filter by bust size
  if (filters.bustSize) {
    filtered = filtered.filter(staff => {
      if (filters.bustSize.includes("以上")) {
        return staff.bust >= filters.bustSize.replace("以上", "")
      }
      return staff.bust === filters.bustSize
    })
  }

  // Filter by waist range
  if (filters.waistRange) {
    const [min, max] = filters.waistRange.split("-").map(num => parseInt(num))
    filtered = filtered.filter(staff => {
      if (filters.waistRange.includes("以上")) {
        return staff.waist >= min
      }
      if (filters.waistRange.includes("以下")) {
        return staff.waist <= min
      }
      return staff.waist >= min && staff.waist <= (max || min)
    })
  }

  // Filter by type
  if (filters.type) {
    filtered = filtered.filter(staff => staff.type === filters.type)
  }

  setCastData(filtered)
}

const handleFilterDialogOpen = () => {
  setFilterDialogOpen(true)
}

const handleFilterDialogClose = () => {
  setFilterDialogOpen(false)
}

const handleFilterDialogApply = (filters: FilterOptions) => {
  handleFilter(filters)
  handleFilterDialogClose()
}


const handleCustomerSelection = (customer: Customer | null) => { // Update: Added Customer | null type
  setSelectedCustomer(customer);
};

const allAppointments: ReservationData[] = castData.flatMap(staff =>
  staff.appointments.map(appointment => {
    // 2. Fix: Type guard and consistent ID check
    const customer = customerList.find(c => c.id === String(appointment.customerId));

    // 3. Fix: Log customer data for debugging
    console.log("Customer found:", customer);

    return {
      ...appointment,
      id: appointment.id.toString(),
      // 2. Fix: Provide fallback for customerName
      customerName: customer?.name || "顧客が見つかりません",
      customerType: "regular",
      // 2. Fix: Use optional chaining for customer details
      phoneNumber: customer?.phone || "",
      email: customer?.email || "",
      points: customer?.points || 0,
      bookingStatus: appointment.status === "confirmed" ? "確定済" : "仮予約",
      staffConfirmation: "確認済",
      customerConfirmation: "確認済",
      prefecture: "東京都",
      district: "豊島区",
      location: "池袋（北口・西口）(0円)",
      locationType: "ホテル利用",
      specificLocation: "location details placeholder",
      staff: staff.name,
      marketingChannel: "Replace me",
      date: format(appointment.startTime, "yyyy-MM-dd"), // format appointment.startTime
      time: format(appointment.startTime, "HH:mm"), // format appointment.startTime
      inOutTime: `${format(new Date(appointment.startTime), "HH:mm")} - ${format(new Date(appointment.endTime), "HH:mm")}`,
      course: getCourseById(appointment.serviceId)?.name || "N/A",
      freeExtension: "0",
      designation: "N/A",
      designationFee: "0円",
      options: {},
      transportationFee: 0,
      paymentMethod: "現金",
      discount: "なし",
      additionalFee: 0,
      totalPayment: appointment.price,
      storeRevenue: 0,
      staffRevenue: 0,
      staffBonusFee: 0,
      startTime: new Date(appointment.startTime),
      endTime: new Date(appointment.endTime),
      staffImage: staff.image,
      customerId: String(appointment.customerId) // Ensure customerId is always a string
    }
  })
);

// 5. Fix: Log allAppointments for debugging
console.log("All Appointments:", allAppointments);

return (
  <div className="min-h-screen bg-white">
    <Header />
    <InfoBar selectedCustomer={selectedCustomer} />
    <DateNavigation selectedDate={selectedDate} onSelectDate={setSelectedDate} />
    <ViewToggle view={view} onViewChange={setView} />
    <ActionButtons
      onRefresh={handleRefresh}
      onFilterCharacter={handleFilterCharacter}
      onFilter={handleFilterDialogOpen}
      onCustomerSelect={handleCustomerSelection} // Update: Added handleCustomerSelection prop
      selectedCustomer={selectedCustomer} // Update: Added selectedCustomer prop
    />

    <FilterDialog
      open={filterDialogOpen}
      onClose={handleFilterDialogClose}
      onApply={handleFilterDialogApply}
    />

    {view === "timeline" ? (
      <Timeline
        staff={castData}
        selectedDate={selectedDate}
        selectedCustomer={selectedCustomer} // Update: Added selectedCustomer prop
        setSelectedAppointment={setSelectedAppointment}
      />
    ) : (
      <ReservationTable
        reservations={allAppointments}
        onOpenReservation={setSelectedAppointment}
      />
    )}

    {/* 3. Fix: Uncomment the ReservationDialog */}
    {selectedAppointment && (
      <ReservationDialog
        open={!!selectedAppointment}
        onOpenChange={(open) => !open && setSelectedAppointment(null)}
        reservation={selectedAppointment}
      />
    )}


  </div>
)
}

interface ActionButtonsProps {
onRefresh: () => void,
onFilterCharacter: (char: string) => void,
onFilter: () => void,
onCustomerSelect: (customer: Customer | null) => void, // Update: Added Customer | null type
selectedCustomer: Customer | null // Update: Added selectedCustomer prop
} 
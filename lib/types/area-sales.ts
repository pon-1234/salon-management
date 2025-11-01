export interface AreaSalesData {
  area: string
  monthlySales: number[]
  total: number
  monthlyCustomers?: number[]
  customerTotal?: number
  isSubtotal?: boolean
}

export interface TransportationFee {
  area: string
  fee: number
}

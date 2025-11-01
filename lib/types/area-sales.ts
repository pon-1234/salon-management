export interface AreaSalesData {
  area: string
  prefecture?: string
  monthlySales: number[]
  total: number
  monthlyCustomers?: number[]
  customerTotal?: number
  monthlyNewCustomers?: number[]
  newCustomerTotal?: number
  isSubtotal?: boolean
}

export interface TransportationFee {
  area: string
  fee: number
}

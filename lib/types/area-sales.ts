export interface AreaSalesData {
  area: string
  monthlySales: number[]
  total: number
  isSubtotal?: boolean
}

export interface TransportationFee {
  area: string
  fee: number
}

export interface AreaSalesData {
  area: string
  monthlySales: number[]
  total: number
  isSubtotal?: boolean
}

export interface AreaSalesReport {
  year: number
  areas: AreaSalesData[]
  total: {
    monthlySales: number[]
    total: number
  }
}

export interface TransportationFee {
  area: string
  fee: number
}

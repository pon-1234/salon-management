export interface DistrictSalesData {
  district: string
  code: string
  monthlySales: number[]
  total: number
  monthlyCustomers?: number[]
  customerTotal?: number
  monthlyNewCustomers?: number[]
  newCustomerTotal?: number
}

export interface DistrictSalesReport {
  year: number
  area: string
  districts: DistrictSalesData[]
  total: {
    monthlySales: number[]
    total: number
    monthlyCustomers?: number[]
    customerTotal?: number
    monthlyNewCustomers?: number[]
    newCustomerTotal?: number
  }
}

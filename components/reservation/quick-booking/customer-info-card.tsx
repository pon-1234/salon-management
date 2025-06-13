import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Phone, User } from 'lucide-react'

interface CustomerInfoCardProps {
  customerName: string
  customerType: string
  phoneNumber: string
  points: number
}

export function CustomerInfoCard({ 
  customerName, 
  customerType, 
  phoneNumber, 
  points 
}: CustomerInfoCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center">
          <User className="mr-2 h-5 w-5" />
          お客様情報
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">{customerName}</h3>
              <Badge variant="secondary" className="mt-1">
                {customerType}
              </Badge>
            </div>
            <div className="text-right">
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-1" />
                <span className="font-semibold">{phoneNumber}</span>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                現在 {points}pt
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
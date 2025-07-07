import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface CustomerInfoProps {
  customer: {
    id: string
    name: string
    image: string
    lastVisit: string
    totalVisits: number
    favoriteStaff: string
  }
}

export function CustomerInfo({ customer }: CustomerInfoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>顧客情報</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center space-x-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={customer.image} alt={customer.name} />
            <AvatarFallback>{customer.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-semibold">{customer.name}</h2>
            <p className="text-sm text-gray-500">ID: {customer.id}</p>
          </div>
        </div>
        <div className="space-y-2">
          <p>
            <span className="font-medium">最終来店日:</span> {customer.lastVisit}
          </p>
          <p>
            <span className="font-medium">来店回数:</span> {customer.totalVisits}回
          </p>
          <p>
            <span className="font-medium">お気に入りスタッフ:</span> {customer.favoriteStaff}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

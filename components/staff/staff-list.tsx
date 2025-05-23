import { Staff } from "@/lib/staff/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface StaffListProps {
  staff: Staff[]
}

export function StaffList({ staff }: StaffListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {staff.map((member) => (
        <Card key={member.id} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="relative">
              <img
                src={member.image}
                alt={member.name}
                className="w-full h-48 object-cover"
              />
              <Badge className="absolute top-2 right-2 bg-emerald-600">
                {member.workStatus}
              </Badge>
            </div>
            <div className="p-4">
              <Link href={`/staff/${member.id}`} className="text-lg font-semibold hover:text-emerald-600">
                {member.name}
              </Link>
              <p className="text-sm text-gray-500">{member.nameKana}</p>
              <div className="mt-2 text-sm">
                <p>{member.age}歳 / {member.height}cm</p>
                <p>{member.bust}/{member.waist}/{member.hip}</p>
                <p>{member.type}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

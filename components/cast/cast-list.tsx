import { Cast } from '@/lib/cast/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface CastListProps {
  staff: Cast[]
}

export function CastList({ staff }: CastListProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {staff.map((member) => (
        <Card key={member.id} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={member.image}
                alt={member.name}
                className="aspect-[7/10] w-full object-cover"
              />
              <Badge className="absolute right-2 top-2 bg-emerald-600">{member.workStatus}</Badge>
            </div>
            <div className="p-4">
              <Link
                href={`/cast/${member.id}`}
                className="text-lg font-semibold hover:text-emerald-600"
              >
                {member.name}
              </Link>
              <p className="text-sm text-gray-500">{member.nameKana}</p>
              <div className="mt-2 text-sm">
                <p>
                  {member.age}歳 / {member.height}cm
                </p>
                <p>
                  {member.bust}/{member.waist}/{member.hip}
                </p>
                <p>{member.type}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

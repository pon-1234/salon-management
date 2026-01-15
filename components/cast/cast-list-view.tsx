import { Cast } from '@/lib/cast/types'
import { FALLBACK_IMAGE } from '@/lib/cast/mapper'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Phone, Mail } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

interface CastListViewProps {
  casts: Cast[]
  view?: 'grid' | 'list'
}

export function CastListView({ casts, view = 'grid' }: CastListViewProps) {
  if (view === 'grid') {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {casts.map((member) => {
          const memberImage = member.image?.trim() ? member.image : FALLBACK_IMAGE

          return (
            <Card key={member.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={memberImage}
                    alt={member.name}
                    className="aspect-[7/10] w-full object-cover"
                  />
                  <Badge className="absolute right-2 top-2 bg-emerald-600">
                    {member.workStatus}
                  </Badge>
                </div>
                <div className="p-4">
                  <Link
                    href={`/admin/cast/manage/${member.id}`}
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
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {casts.map((member) => {
        const memberImage = member.image?.trim() ? member.image : FALLBACK_IMAGE

        return (
          <div key={member.id} className="flex items-start gap-4 rounded-lg bg-white p-4 shadow">
            <Link href={`/admin/cast/manage/${member.id}`} className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={memberImage}
                alt={member.name}
                className="aspect-[7/10] w-20 rounded object-cover"
              />
            </Link>

            <div className="min-w-0 flex-1">
              <div className="space-y-1">
                <Link
                  href={`/admin/cast/manage/${member.id}`}
                  className="text-lg font-medium hover:text-emerald-600"
                >
                  {member.name}
                </Link>
                <div className="text-gray-600">{member.nameKana}</div>
                <div className="text-gray-500">
                  {member.age}歳 | {member.height}cm | {member.type}
                </div>
                <div className="text-gray-500">入金処理 (今月) (先月)</div>
              </div>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="destructive" className="h-8">
                  <Phone className="mr-2 h-4 w-4" />
                  電話をかける
                </Button>
                <Button size="sm" variant="secondary" className="h-8">
                  <Mail className="mr-2 h-4 w-4" />
                  業務連絡
                </Button>
              </div>
            </div>

            <div className="shrink-0 text-sm text-gray-500">
              {member.workStatus === '出勤' ? '出勤中' : '未出勤'}
            </div>
          </div>
        )
      })}
    </div>
  )
}

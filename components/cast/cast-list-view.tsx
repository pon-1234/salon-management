/**
 * @design_doc   Client operational review: cast list actions must navigate to real workflows
 * @related_to   CastManagePage: receives deep links for sales, payments, and settlements
 * @known_issues Cast contact details are not part of the current Cast domain model
 */
import { Cast } from '@/lib/cast/types'
import { FALLBACK_IMAGE } from '@/lib/cast/mapper'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SafeImage } from '@/components/ui/safe-image'
import Link from 'next/link'

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
                  <Link
                    href={`/admin/cast/manage/${member.id}`}
                    aria-label={`${member.name}の詳細`}
                    className="block"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <SafeImage
                      src={memberImage}
                      alt={member.name}
                      className="aspect-[7/10] w-full object-cover"
                    />
                  </Link>
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
            <Link
              href={`/admin/cast/manage/${member.id}`}
              aria-label={`${member.name}の詳細`}
              className="shrink-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <SafeImage
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
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="h-8" asChild>
                  <Link href={`/admin/cast/manage/${member.id}?tab=sales`}>売上管理</Link>
                </Button>
                <Button size="sm" variant="outline" className="h-8" asChild>
                  <Link href={`/admin/cast/manage/${member.id}?tab=settlement`}>精算</Link>
                </Button>
                <Button size="sm" variant="outline" className="h-8" asChild>
                  <Link href={`/admin/cast/manage/${member.id}?tab=performance`}>就業成績</Link>
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

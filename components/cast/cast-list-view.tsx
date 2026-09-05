/**
 * @design_doc   Client operational review: cast list actions must navigate to real workflows
 * @related_to   CastManagePage: receives deep links for sales, payments, and settlements
 * @known_issues None
 */
import { Cast } from '@/lib/cast/types'
import { FALLBACK_IMAGE } from '@/lib/cast/mapper'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SafeImage } from '@/components/ui/safe-image'
import Link from 'next/link'
import { AlertTriangle, MessageSquare, Phone } from 'lucide-react'
import { getCastVerificationWarnings } from '@/lib/cast/verification-warnings'

interface CastListViewProps {
  casts: Cast[]
  view?: 'grid' | 'list'
}

export function CastListView({ casts, view = 'grid' }: CastListViewProps) {
  const employmentLabel = (status: Cast['employmentStatus'] | undefined) =>
    status === 'provisional' ? '仮登録' : status === 'retired' ? '退店' : '在籍'
  if (view === 'grid') {
    return (
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
        {casts.map((member) => {
          const memberImage = member.image?.trim() ? member.image : FALLBACK_IMAGE
          const warnings = getCastVerificationWarnings(member)

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
                      className="h-28 w-full object-cover object-top md:h-32"
                    />
                  </Link>
                  <Badge className="absolute right-2 top-2 bg-emerald-600">
                    {employmentLabel(member.employmentStatus)}
                  </Badge>
                </div>
                <div className="p-2">
                  <Link
                    href={`/admin/cast/manage/${member.id}`}
                    className="text-sm font-semibold hover:text-emerald-600"
                  >
                    {member.name}
                  </Link>
                  <p className="truncate text-xs text-gray-500">{member.nameKana}</p>
                  <div className="mt-1 text-xs">
                    <p>
                      {member.age}歳 / {member.height}cm
                    </p>
                    <p>
                      {member.bust}/{member.waist}/{member.hip}
                    </p>
                    <p className="truncate">{member.type}</p>
                  </div>
                  {warnings.length > 0 ? (
                    <div className="mt-2 text-xs text-amber-700" title={warnings.join(' / ')}>
                      <AlertTriangle className="mr-1 inline h-3 w-3" />
                      {warnings.map((warning) => (
                        <span key={warning} className="block">
                          {warning
                            .replace('写真付き身分証が未確認です', '身分証 未確認')
                            .replace('本籍地入り住民票が未確認です', '住民票 未確認')}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-2 flex gap-1">
                    {member.phone ? (
                      <Button size="sm" variant="outline" className="h-7 px-2" asChild>
                        <a href={`tel:${member.phone}`} aria-label={`${member.name}へ電話`}>
                          <Phone className="h-3 w-3" />
                        </a>
                      </Button>
                    ) : null}
                    <Button size="sm" variant="outline" className="h-7 px-2" asChild>
                      <Link
                        href={`/admin/chat?castId=${encodeURIComponent(member.id)}`}
                        aria-label={`${member.name}とチャット`}
                      >
                        <MessageSquare className="h-3 w-3" />
                      </Link>
                    </Button>
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
    <div className="divide-y rounded-lg border bg-white">
      {casts.map((member) => {
        const memberImage = member.image?.trim() ? member.image : FALLBACK_IMAGE
        const warnings = getCastVerificationWarnings(member)

        return (
          <div key={member.id} className="flex items-center gap-3 p-2">
            <Link
              href={`/admin/cast/manage/${member.id}`}
              aria-label={`${member.name}の詳細`}
              className="shrink-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <SafeImage
                src={memberImage}
                alt={member.name}
                className="aspect-[4/5] w-14 rounded object-cover"
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
                <Badge variant={member.employmentStatus === 'retired' ? 'secondary' : 'outline'}>
                  {employmentLabel(member.employmentStatus)}
                </Badge>
                {warnings.length > 0 ? (
                  <Badge variant="outline" className="border-amber-300 text-amber-700">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    {warnings.map((warning) => (
                      <span key={warning} className="block">
                        {warning
                          .replace('写真付き身分証が未確認です', '身分証 未確認')
                          .replace('本籍地入り住民票が未確認です', '住民票 未確認')}
                      </span>
                    ))}
                  </Badge>
                ) : null}
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
          </div>
        )
      })}
    </div>
  )
}

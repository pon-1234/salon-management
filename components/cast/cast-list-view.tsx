import { Cast } from "@/lib/cast/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Phone, Mail } from 'lucide-react'
import Link from "next/link"
import { format } from "date-fns"

interface CastListViewProps {
  casts: Cast[]
  view?: "grid" | "list"
}

export function CastListView({ casts, view = "grid" }: CastListViewProps) {
  if (view === "grid") {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {casts.map((member) => (
          <Card key={member.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="relative">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full aspect-[7/10] object-cover"
                />
                <Badge className="absolute top-2 right-2 bg-emerald-600">
                  {member.workStatus}
                </Badge>
              </div>
              <div className="p-4">
                <Link href={`/cast/manage/${member.id}`} className="text-lg font-semibold hover:text-emerald-600">
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

  return (
    <div className="space-y-4">
      {casts.map((member) => (
        <div
          key={member.id}
          className="bg-white rounded-lg shadow p-4 flex items-start gap-4"
        >
          <Link href={`/cast/manage/${member.id}`} className="shrink-0">
            <img
              src={member.image}
              alt={member.name}
              className="w-20 aspect-[7/10] object-cover rounded"
            />
          </Link>

          <div className="flex-1 min-w-0">
            <div className="space-y-1">
              <Link 
                href={`/cast/manage/${member.id}`}
                className="text-lg font-medium hover:text-emerald-600"
              >
                {member.name}
              </Link>
              <div className="text-gray-600">{member.nameKana}</div>
              <div className="text-gray-500">{member.age}歳 | {member.height}cm | {member.type}</div>
              <div className="text-gray-500">入金処理 (今月) (先月)</div>
            </div>
            <div className="flex gap-2 mt-2">
              <Button 
                size="sm" 
                variant="destructive"
                className="h-8"
              >
                <Phone className="w-4 h-4 mr-2" />
                電話をかける
              </Button>
              <Button 
                size="sm" 
                variant="secondary"
                className="h-8"
              >
                <Mail className="w-4 h-4 mr-2" />
                業務連絡
              </Button>
            </div>
          </div>

          <div className="text-sm text-gray-500 shrink-0">
            {member.workStatus === "出勤" ? "出勤中" : "未出勤"}
          </div>
        </div>
      ))}
    </div>
  )
}

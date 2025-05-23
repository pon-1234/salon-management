import { Badge } from "@/components/ui/badge"
import { Staff } from "@/lib/staff/types"
import { calculateAge } from "@/lib/customer/utils"

interface StaffProfileProps {
  staff: Staff
}

export function StaffProfile({ staff }: StaffProfileProps) {
  const age = calculateAge(new Date(staff.birthDate));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">基本情報</h2>
      <div className="relative">
        <img
          src={staff.image}
          alt={`${staff.name}の写真`}
          className="w-full h-[400px] object-cover rounded-lg"
        />
        <Badge className="absolute top-4 left-4 bg-emerald-600">掲載中</Badge>
      </div>
      <div className="space-y-4">
        <h3 className="text-3xl font-bold">{staff.name}</h3>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-gray-600">年齢：</dt>
            <dd>{age}歳</dd>
          </div>
          <div>
            <dt className="text-gray-600">スリーサイズ：</dt>
            <dd>{staff.bust}/{staff.waist}/{staff.hip} ({staff.bust}カップ)</dd>
          </div>
          <div>
            <dt className="text-gray-600">身長：</dt>
            <dd>{staff.height}cm</dd>
          </div>
          <div>
            <dt className="text-gray-600">タイプ：</dt>
            <dd>{staff.type}</dd>
          </div>
        </dl>
      </div>
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <div>ネット予約</div>
          <div className="text-emerald-600">{staff.netReservation ? "可" : "不可"}</div>
        </div>
        <div className="flex justify-between items-center border-b pb-2">
          <div>特別指名料</div>
          <div>{staff.specialDesignationFee ? `${staff.specialDesignationFee.toLocaleString()}円` : "-"}</div>
        </div>
        <div className="flex justify-between items-center border-b pb-2">
          <div>本指名</div>
          <div>{staff.regularDesignationFee ? `${staff.regularDesignationFee.toLocaleString()}円` : "-"}</div>
        </div>
      </div>
    </div>
  )
}

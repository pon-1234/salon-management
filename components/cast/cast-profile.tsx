import { Badge } from "@/components/ui/badge"
import { Cast } from "@/lib/cast/types"
import { calculateAge } from "@/lib/customer/utils"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface CastProfileProps {
  staff: Cast
}

export function StaffProfile({ staff }: CastProfileProps) {
  const age = staff.age;

  return (
    <div className="space-y-6">
      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm mx-auto">
            <img
              src={staff.image}
              alt={`${staff.name}の写真`}
              className="w-full aspect-[7/10] object-cover rounded-lg"
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
                <dd>{staff.bust}/{staff.waist}/{staff.hip} ({staff.publicProfile?.bustCup || ""}カップ)</dd>
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
            <div className="flex justify-between items-center border-b pb-2">
              <div>パネル指名ランク</div>
              <div>{staff.panelDesignationRank}</div>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <div>本指名ランク</div>
              <div>{staff.regularDesignationRank}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 公開プロフィール情報 */}
      {staff.publicProfile && (
        <>
          {/* スタイル・個性 */}
          <Card>
            <CardHeader>
              <CardTitle>スタイル・個性</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {staff.publicProfile.bodyType.length > 0 && (
                <div>
                  <dt className="text-gray-600 font-medium">体型</dt>
                  <dd className="flex gap-2 mt-1">
                    {staff.publicProfile.bodyType.map((type) => (
                      <Badge key={type} variant="outline">{type}</Badge>
                    ))}
                  </dd>
                </div>
              )}
              {staff.publicProfile.personality.length > 0 && (
                <div>
                  <dt className="text-gray-600 font-medium">個性</dt>
                  <dd className="flex gap-2 mt-1 flex-wrap">
                    {staff.publicProfile.personality.map((personality) => (
                      <Badge key={personality} variant="secondary">{personality}</Badge>
                    ))}
                  </dd>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 可能プレイ */}
          {staff.publicProfile.availableServices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>可能プレイ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {staff.publicProfile.availableServices.map((service) => (
                    <Badge key={service} variant="outline" className="justify-center py-2">
                      {service}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 詳細情報 */}
          <Card>
            <CardHeader>
              <CardTitle>詳細情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-gray-600">タバコ</dt>
                  <dd>{staff.publicProfile.smoking}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">血液型</dt>
                  <dd>{staff.publicProfile.bloodType}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">出身地</dt>
                  <dd>{staff.publicProfile.birthplace}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">自宅派遣</dt>
                  <dd>{staff.publicProfile.homeVisit}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">タトゥー</dt>
                  <dd>{staff.publicProfile.tattoo}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">外国人</dt>
                  <dd>{staff.publicProfile.foreignerOk}</dd>
                </div>
                {staff.publicProfile.hobbies && (
                  <div>
                    <dt className="text-gray-600">趣味・特技</dt>
                    <dd>{staff.publicProfile.hobbies}</dd>
                  </div>
                )}
                {staff.publicProfile.charmPoint && (
                  <div>
                    <dt className="text-gray-600">チャームポイント</dt>
                    <dd>{staff.publicProfile.charmPoint}</dd>
                  </div>
                )}
                {staff.publicProfile.personalityOneWord && (
                  <div>
                    <dt className="text-gray-600">性格を一言で</dt>
                    <dd>{staff.publicProfile.personalityOneWord}</dd>
                  </div>
                )}
                {staff.publicProfile.favoriteType && (
                  <div>
                    <dt className="text-gray-600">好きな男性タイプ</dt>
                    <dd>{staff.publicProfile.favoriteType}</dd>
                  </div>
                )}
                {staff.publicProfile.favoriteFood && (
                  <div>
                    <dt className="text-gray-600">好きな食べ物</dt>
                    <dd>{staff.publicProfile.favoriteFood}</dd>
                  </div>
                )}
                {staff.publicProfile.specialTechnique && (
                  <div>
                    <dt className="text-gray-600">私の奥義（金の技）</dt>
                    <dd>{staff.publicProfile.specialTechnique}</dd>
                  </div>
                )}
              </dl>

              {staff.publicProfile.massageQualification && staff.publicProfile.qualificationDetails.length > 0 && (
                <div>
                  <dt className="text-gray-600 font-medium">エステ・マッサージ資格</dt>
                  <dd className="mt-2">
                    {staff.publicProfile.qualificationDetails.map((detail, index) => (
                      <Badge key={index} variant="outline" className="mr-2 mb-2">
                        {detail}
                      </Badge>
                    ))}
                  </dd>
                </div>
              )}
            </CardContent>
          </Card>

          {/* お店からの一言 */}
          {staff.publicProfile.shopMessage && (
            <Card>
              <CardHeader>
                <CardTitle>お店からの一言</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{staff.publicProfile.shopMessage}</p>
              </CardContent>
            </Card>
          )}

          {/* お客様へのメッセージ */}
          {staff.publicProfile.customerMessage && (
            <Card>
              <CardHeader>
                <CardTitle>お客様へのメッセージ</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{staff.publicProfile.customerMessage}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

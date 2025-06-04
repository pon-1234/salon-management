import { Badge } from "@/components/ui/badge"
import { Cast } from "@/lib/cast/types"
import { calculateAge } from "@/lib/customer/utils"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CastProfileProps {
  cast: Cast
}

export function CastProfile({ cast }: CastProfileProps) {
  const age = cast.age;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = cast.images && cast.images.length > 0 ? cast.images : [cast.image];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

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
              src={images[currentImageIndex]}
              alt={`${cast.name}の写真 ${currentImageIndex + 1}`}
              className="w-full aspect-[7/10] object-cover rounded-lg"
            />
            <Badge className="absolute top-4 left-4 bg-emerald-600">掲載中</Badge>
            
            {images.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                  onClick={prevImage}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                  onClick={nextImage}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      className={`w-2 h-2 rounded-full ${
                        index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                      onClick={() => setCurrentImageIndex(index)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
          
          {/* 画像ギャラリー */}
          {images.length > 1 && (
            <div className="flex flex-wrap gap-2 justify-center">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`relative ${
                    index === currentImageIndex ? 'ring-2 ring-emerald-500' : ''
                  }`}
                >
                  <img
                    src={image}
                    alt={`${cast.name} 画像 ${index + 1}`}
                    className="w-16 h-20 object-cover rounded border"
                  />
                </button>
              ))}
            </div>
          )}
          <div className="space-y-4">
            <h3 className="text-3xl font-bold">{cast.name}</h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-gray-600">年齢：</dt>
                <dd>{age}歳</dd>
              </div>
              <div>
                <dt className="text-gray-600">スリーサイズ：</dt>
                <dd>{cast.bust}/{cast.waist}/{cast.hip} ({cast.publicProfile?.bustCup || ""}カップ)</dd>
              </div>
              <div>
                <dt className="text-gray-600">身長：</dt>
                <dd>{cast.height}cm</dd>
              </div>
              <div>
                <dt className="text-gray-600">タイプ：</dt>
                <dd>{cast.type}</dd>
              </div>
            </dl>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <div>ネット予約</div>
              <div className="text-emerald-600">{cast.netReservation ? "可" : "不可"}</div>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <div>特別指名料</div>
              <div>{cast.specialDesignationFee ? `${cast.specialDesignationFee.toLocaleString()}円` : "-"}</div>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <div>本指名</div>
              <div>{cast.regularDesignationFee ? `${cast.regularDesignationFee.toLocaleString()}円` : "-"}</div>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <div>パネル指名ランク</div>
              <div>{cast.panelDesignationRank}</div>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <div>本指名ランク</div>
              <div>{cast.regularDesignationRank}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 公開プロフィール情報 */}
      {cast.publicProfile && (
        <>
          {/* スタイル・個性 */}
          <Card>
            <CardHeader>
              <CardTitle>スタイル・個性</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cast.publicProfile.bodyType.length > 0 && (
                <div>
                  <dt className="text-gray-600 font-medium">体型</dt>
                  <dd className="flex gap-2 mt-1">
                    {cast.publicProfile.bodyType.map((type) => (
                      <Badge key={type} variant="outline">{type}</Badge>
                    ))}
                  </dd>
                </div>
              )}
              {cast.publicProfile.personality.length > 0 && (
                <div>
                  <dt className="text-gray-600 font-medium">個性</dt>
                  <dd className="flex gap-2 mt-1 flex-wrap">
                    {cast.publicProfile.personality.map((personality) => (
                      <Badge key={personality} variant="secondary">{personality}</Badge>
                    ))}
                  </dd>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 可能プレイ */}
          {cast.publicProfile.availableServices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>可能プレイ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {cast.publicProfile.availableServices.map((service) => (
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
                  <dd>{cast.publicProfile.smoking}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">血液型</dt>
                  <dd>{cast.publicProfile.bloodType}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">出身地</dt>
                  <dd>{cast.publicProfile.birthplace}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">自宅派遣</dt>
                  <dd>{cast.publicProfile.homeVisit}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">タトゥー</dt>
                  <dd>{cast.publicProfile.tattoo}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">外国人</dt>
                  <dd>{cast.publicProfile.foreignerOk}</dd>
                </div>
                {cast.publicProfile.hobbies && (
                  <div>
                    <dt className="text-gray-600">趣味・特技</dt>
                    <dd>{cast.publicProfile.hobbies}</dd>
                  </div>
                )}
                {cast.publicProfile.charmPoint && (
                  <div>
                    <dt className="text-gray-600">チャームポイント</dt>
                    <dd>{cast.publicProfile.charmPoint}</dd>
                  </div>
                )}
                {cast.publicProfile.personalityOneWord && (
                  <div>
                    <dt className="text-gray-600">性格を一言で</dt>
                    <dd>{cast.publicProfile.personalityOneWord}</dd>
                  </div>
                )}
                {cast.publicProfile.favoriteType && (
                  <div>
                    <dt className="text-gray-600">好きな男性タイプ</dt>
                    <dd>{cast.publicProfile.favoriteType}</dd>
                  </div>
                )}
                {cast.publicProfile.favoriteFood && (
                  <div>
                    <dt className="text-gray-600">好きな食べ物</dt>
                    <dd>{cast.publicProfile.favoriteFood}</dd>
                  </div>
                )}
                {cast.publicProfile.specialTechnique && (
                  <div>
                    <dt className="text-gray-600">私の奥義（金の技）</dt>
                    <dd>{cast.publicProfile.specialTechnique}</dd>
                  </div>
                )}
              </dl>

              {cast.publicProfile.massageQualification && cast.publicProfile.qualificationDetails.length > 0 && (
                <div>
                  <dt className="text-gray-600 font-medium">エステ・マッサージ資格</dt>
                  <dd className="mt-2">
                    {cast.publicProfile.qualificationDetails.map((detail, index) => (
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
          {cast.publicProfile.shopMessage && (
            <Card>
              <CardHeader>
                <CardTitle>お店からの一言</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{cast.publicProfile.shopMessage}</p>
              </CardContent>
            </Card>
          )}

          {/* お客様へのメッセージ */}
          {cast.publicProfile.customerMessage && (
            <Card>
              <CardHeader>
                <CardTitle>お客様へのメッセージ</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{cast.publicProfile.customerMessage}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

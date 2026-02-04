import { notFound } from 'next/navigation'
import { fetchStoreBySlug } from '@/lib/store/public-api'
import { StoreNavigation } from '@/components/store-navigation'
import { StoreFooter } from '@/components/store-footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Heart, Star, Shield } from 'lucide-react'

export default async function ServicesPage({ params }: { params: { store: string } }) {
  const { store: storeSlug } = params
  const store = await fetchStoreBySlug(storeSlug)

  if (!store) {
    notFound()
  }

  const services = {
    basic: [
      '本格睾丸マッサージ',
      'パウダーマッサージ',
      'オイルマッサージ',
      '指圧マッサージ',
      '全身マッサージ',
      '密着フェザータッチ',
      '鼠径部回春マッサージ',
      '上半身リップサービス',
      '洗体補助サービス',
      '全身密着泡洗体',
      'トップレスサービス',
      'Tバックランジェリー',
      '最後はローションにて極上のハンドフィニッシュ',
    ],
    special: [
      {
        name: '気分に合わせた圧',
        desc: 'がっつり強めからフェザータッチまでお好みの圧をお申し付けください',
      },
      { name: '心のケア', desc: '技術だけではリラクゼーションにならないと考えております' },
      { name: '会話での癒し', desc: '女性らしい心遣いや会話での癒しも重要です' },
      { name: '厳選採用', desc: '施術を受けながらも楽しめるセラピストを厳選採用' },
    ],
  }

  return (
    <>
      <StoreNavigation />

      <main className="min-h-screen bg-[#0b0b0b] text-foreground">
        {/* Header */}
        <div className="relative overflow-hidden border-b border-[#2f2416] bg-[#0f0f0f] py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,206,126,0.18),_transparent_60%)]" />
          <div className="relative mx-auto max-w-6xl px-4 text-center">
            <p className="luxury-display text-xs tracking-[0.45em] text-[#d7b46a]">SERVICES</p>
            <h1 className="mt-4 text-3xl font-semibold text-[#f7e2b5] md:text-4xl">プレイ内容</h1>
            <p className="mt-3 text-sm text-[#d7c39c] md:text-base">極上の癒しと快楽をご提供</p>
          </div>
        </div>

        {/* Main Message */}
        <section className="luxury-section py-12">
          <div className="mx-auto max-w-4xl space-y-6 px-4 text-center">
            <h2 className="text-2xl font-semibold text-[#f5e6c4] md:text-3xl">
              マッサージの技術と
              <br />
              睾丸の知識を兼ね備えた
              <br />
              エッチな密着睾丸マッサージ
            </h2>
            <p className="text-lg font-semibold text-[#f3d08a]">快楽と癒し{store.displayName}</p>
          </div>
        </section>

        {/* Basic Services */}
        <section className="luxury-section py-12">
          <div className="mx-auto max-w-6xl px-4">
            <Card className="luxury-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl text-[#f5e6c4]">
                  <Sparkles className="h-6 w-6 text-[#f3d08a]" />
                  基本施術プレイ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {services.basic.map((service, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 rounded-lg border border-transparent p-3 transition hover:border-[#3b2e1f] hover:bg-[#15120b]"
                    >
                      <Star className="mt-0.5 h-5 w-5 text-[#f3d08a]" />
                      <span className="text-sm text-[#f5e6c4]">{service}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-lg border border-[#3b2e1f] bg-[#121212] p-4">
                  <p className="text-sm text-[#d7c39c]">
                    ※全身密着泡洗体サービスご希望の場合はオールヌード（OP）が必要になります。
                  </p>
                  <p className="mt-2 text-sm text-[#d7c39c]">
                    ※ご希望によりマスクを着用されたままで施術を受けて頂く事も可能です。
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Special Features */}
        <section className="luxury-section py-12">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="mb-12 text-center text-2xl font-semibold text-[#f5e6c4] md:text-3xl">
              施術だけでない心のケア
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {services.special.map((feature, index) => (
                <Card
                  key={index}
                  className="luxury-panel transition-shadow hover:shadow-[0_20px_40px_rgba(0,0,0,0.45)]"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="rounded-lg bg-[#1b140b] p-3">
                        <Heart className="h-6 w-6 text-[#f3d08a]" />
                      </div>
                      <div>
                        <h3 className="mb-2 text-lg font-bold text-[#f5e6c4]">{feature.name}</h3>
                        <p className="text-muted-foreground">{feature.desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Safety Measures */}
        <section className="luxury-section py-12">
          <div className="mx-auto max-w-4xl px-4">
            <Card className="luxury-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#f5e6c4]">
                  <Shield className="h-6 w-6 text-[#2fc8b7]" />
                  感染予防への取組み
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {[
                    '毎月性病検査の実施',
                    '出勤時の体温計測',
                    'マスク着用の徹底',
                    '手洗い・うがいの徹底',
                    '待機時の換気',
                    'プレイ後の消毒徹底',
                  ].map((measure, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="flex h-6 w-6 items-center justify-center rounded-full border-[#2fc8b7] bg-[#10211e] p-0 text-[#2fc8b7]"
                      >
                        ✓
                      </Badge>
                      <span className="text-sm text-[#f5e6c4]">{measure}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Service Philosophy */}
        <section className="luxury-section py-12">
          <div className="mx-auto max-w-4xl space-y-6 px-4 text-center">
            <h2 className="text-2xl font-semibold text-[#f5e6c4]">サービスへのこだわり</h2>
            <div className="prose prose-invert prose-lg mx-auto text-[#d7c39c]">
              <p>
                {store.name}では、密着睾丸マッサージを体験できます。
                当店の「超密着睾丸マッサージ」のサービスを徹底して追及しております。
              </p>
              <p>
                独自のサービスマニュアルにて講習を行い、全身のオイルマッサージや
                パウダーマッサージも十分にお楽しみいただけてとても満足度の高い
                プレイ内容になっております。
              </p>
              <p>
                サービス内容とキャストに特にこだわっています。
                大人の清潔感のある女性や本能的にエロい女性など
                サービス精神が高くお客様を気持ちよくして差し上げたい女性を 主に採用しております。
              </p>
            </div>
          </div>
        </section>

        <StoreFooter store={store} />
      </main>
    </>
  )
}

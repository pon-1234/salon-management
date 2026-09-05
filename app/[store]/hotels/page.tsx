/**
 * @design_doc https://app.notion.com/p/3ccdda8d8bde80ec928cc17adff35cde
 * @related_to HotelInfoPage supplies store-specific public hotel details
 * @known_issues Internal notes and import source fields are excluded from the public query
 */
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { fetchStoreBySlug } from '@/lib/store/public-api'
import { StoreNavigation } from '@/components/store-navigation'
import { StoreFooter } from '@/components/store-footer'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'ホテル案内' }

export default async function HotelsPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params
  const store = await fetchStoreBySlug(slug)
  if (!store) notFound()
  const hotels = await db.hotelSettings.findMany({
    where: { storeId: store.id, isActive: true },
    orderBy: [{ displayOrder: 'asc' }, { hotelName: 'asc' }],
    select: { id: true, hotelName: true, area: true, station: true, address: true, phone: true },
  })
  return (
    <>
      <StoreNavigation />
      <main className="min-h-screen bg-[#0b0b0b] px-4 py-12 text-[#f5e6c4]">
        <div className="mx-auto max-w-5xl space-y-8">
          <h1 className="text-center text-3xl font-semibold">ホテル案内</h1>
          {hotels.length === 0 ? (
            <p className="text-center text-muted-foreground">
              ホテルについては店舗へお問い合わせください。
            </p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {hotels.map((hotel) => (
                <article key={hotel.id} className="luxury-panel space-y-3 rounded-xl border p-6">
                  <h2 className="text-xl font-semibold">{hotel.hotelName}</h2>
                  <p className="text-sm text-[#d7c39c]">
                    {[hotel.area, hotel.station].filter(Boolean).join(' ＞ ')}
                  </p>
                  {hotel.address ? <p className="text-sm">{hotel.address}</p> : null}
                  {hotel.phone ? <p className="text-sm">電話：{hotel.phone}</p> : null}
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
      <StoreFooter store={store} />
    </>
  )
}

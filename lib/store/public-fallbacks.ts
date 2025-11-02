import { storesData } from './data'
import type {
  PublicBannerItem,
  PublicCastSummary,
  PublicReviewSummary,
  PublicScheduleSummary,
  PublicStoreHomeData,
} from './public-types'
import type { Store } from './types'

function createCastSummary(partial: Partial<PublicCastSummary> & { name: string }): PublicCastSummary {
  const {
    panelDesignationRank = 0,
    regularDesignationRank = 0,
    netReservation = true,
    workStatus = '出勤',
    sizeLabel = '',
  } = partial

  return {
    id: partial.id ?? `fallback-${partial.name}`,
    name: partial.name,
    age: partial.age ?? null,
    height: partial.height ?? null,
    bust: partial.bust ?? null,
    waist: partial.waist ?? null,
    hip: partial.hip ?? null,
    type: partial.type ?? null,
    image: partial.image ?? null,
    images: partial.images ?? [],
    panelDesignationRank,
    regularDesignationRank,
    netReservation,
    workStatus,
    sizeLabel,
  }
}

function createScheduleSummary(
  cast: PublicCastSummary,
  startTime: string,
  endTime: string
): PublicScheduleSummary {
  return {
    castId: cast.id,
    castName: cast.name,
    startTime,
    endTime,
    cast,
  }
}

const FALLBACK_BANNERS: PublicBannerItem[] = [
  {
    id: 'fallback-banner-1',
    imageUrl: '/images/banners/campaign-1.jpg',
    mobileImageUrl: '/images/banners/campaign-1-mobile.jpg',
    title: '新規限定！初回30%OFF',
    link: '/pricing',
  },
  {
    id: 'fallback-banner-2',
    imageUrl: '/images/banners/campaign-2.jpg',
    mobileImageUrl: '/images/banners/campaign-2-mobile.jpg',
    title: '平日限定！延長無料キャンペーン',
    link: '/pricing',
  },
  {
    id: 'fallback-banner-3',
    imageUrl: '/images/banners/campaign-3.jpg',
    mobileImageUrl: '/images/banners/campaign-3-mobile.jpg',
    title: '新人キャスト入店記念イベント',
    link: '/cast',
  },
]

const FALLBACK_RANKING = [
  createCastSummary({
    name: 'ことね',
    age: 27,
    panelDesignationRank: 1,
    regularDesignationRank: 1,
    sizeLabel: 'T158 B95(G) W63 H97',
  }),
  createCastSummary({
    name: 'ののか',
    age: 31,
    panelDesignationRank: 2,
    regularDesignationRank: 2,
    sizeLabel: 'T160 B84(F) W60 H85',
  }),
  createCastSummary({
    name: 'みるく',
    age: 20,
    panelDesignationRank: 3,
    regularDesignationRank: 3,
    sizeLabel: 'T160 B96(G) W62 H98',
  }),
  createCastSummary({
    name: 'すずか',
    age: 29,
    panelDesignationRank: 4,
    regularDesignationRank: 4,
    sizeLabel: 'T155 B93(F) W58 H90',
  }),
]

const FALLBACK_NEWCOMERS = [
  createCastSummary({
    name: 'ひかる',
    age: 28,
    sizeLabel: 'T156 B83(D) W57 H82',
  }),
  createCastSummary({
    name: 'ゆりこ',
    age: 27,
    sizeLabel: 'T161 B86(E) W60 H88',
  }),
  createCastSummary({
    name: 'せな',
    age: 32,
    sizeLabel: 'T157 B84(E) W57 H83',
  }),
  createCastSummary({
    name: 'ことね',
    age: 27,
    sizeLabel: 'T158 B95(G) W63 H97',
  }),
]

const FALLBACK_SCHEDULE = [
  createScheduleSummary(
    createCastSummary({
      name: 'ののか',
      age: 31,
      sizeLabel: 'T160 B84(F) W60 H85',
    }),
    '2024-06-08T10:00:00+09:00',
    '2024-06-08T18:00:00+09:00'
  ),
  createScheduleSummary(
    createCastSummary({
      name: 'みなみ',
      age: 27,
      sizeLabel: 'T163 B87(G) W64 H88',
    }),
    '2024-06-08T12:00:00+09:00',
    '2024-06-08T20:00:00+09:00'
  ),
  createScheduleSummary(
    createCastSummary({
      name: 'すずか',
      age: 29,
      sizeLabel: 'T155 B93(F) W58 H90',
    }),
    '2024-06-08T14:00:00+09:00',
    '2024-06-08T22:00:00+09:00'
  ),
  createScheduleSummary(
    createCastSummary({
      name: 'きこ',
      age: 32,
      sizeLabel: 'T160 B96(G) W64 H98',
    }),
    '2024-06-08T16:00:00+09:00',
    '2024-06-08T23:00:00+09:00'
  ),
]

const FALLBACK_REVIEWS: PublicReviewSummary[] = [
  {
    id: 'fallback-review-1',
    castId: 'suzuka',
    castName: 'すずか',
    rating: 5,
    comment:
      '容姿もとても綺麗でスタイルも抜群でした！密着も素晴らしかったですし、マッサージもすごくよかったです！',
    createdAt: '2024-06-08T21:12:00+09:00',
    customerAlias: '豊島区 / 匿名',
    area: '豊島区',
  },
  {
    id: 'fallback-review-2',
    castId: 'suzuka',
    castName: 'すずか',
    rating: 5,
    comment:
      '初心者でも入り込みやすい、接客能力。マッサージ技術も独特なものがあり身体が楽になりました。',
    createdAt: '2024-06-07T17:52:00+09:00',
    customerAlias: '豊島区 / 匿名',
    area: '豊島区',
  },
]

export function getFallbackStoreBySlug(slug: string): Store | undefined {
  return storesData.find((store) => store.slug === slug)
}

export function buildFallbackHomeData(slug: string): PublicStoreHomeData | null {
  const store = getFallbackStoreBySlug(slug)
  if (!store) {
    return null
  }

  return {
    store,
    banners: FALLBACK_BANNERS.map((banner) => ({
      ...banner,
      link: banner.link.startsWith('/') ? `/${store.slug}${banner.link}` : banner.link,
    })),
    highlights: {
      ranking: FALLBACK_RANKING,
      newcomers: FALLBACK_NEWCOMERS,
      todaysSchedules: FALLBACK_SCHEDULE,
    },
    reviews: FALLBACK_REVIEWS,
  }
}

export function getDefaultBanners(storeSlug: string): PublicBannerItem[] {
  return FALLBACK_BANNERS.map((banner) => ({
    ...banner,
    link: banner.link.startsWith('/') ? `/${storeSlug}${banner.link}` : banner.link,
  }))
}

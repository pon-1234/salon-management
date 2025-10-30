import { Review, ReviewStats } from './types'

export const reviewsData: Review[] = [
  {
    id: '1',
    storeId: 'ikebukuro',
    castName: 'すずか',
    customerArea: '豊島区',
    rating: 5,
    content:
      '容姿もとても綺麗でスタイルも抜群でした！密着も素晴らしかったですし、マッサージもすごくよかったです！',
    visitDate: new Date('2024-06-08'),
    courseType: '120分コース',
    options: ['オールヌード'],
    isVerified: true,
    helpful: 15,
    tags: ['容姿端麗', 'マッサージ上手', '密着サービス'],
    createdAt: new Date('2024-06-08'),
    updatedAt: new Date('2024-06-08'),
  },
  {
    id: '2',
    storeId: 'ikebukuro',
    castName: 'すずか',
    customerArea: '豊島区',
    rating: 5,
    content:
      '初心者でも入り込みやすい、接客能力。マッサージ技術も独特なものがあり身体が楽になりました。',
    visitDate: new Date('2024-06-07'),
    courseType: '90分コース',
    isVerified: true,
    helpful: 12,
    tags: ['初心者向け', '接客良好', 'マッサージ上手'],
    createdAt: new Date('2024-06-07'),
    updatedAt: new Date('2024-06-07'),
  },
  {
    id: '3',
    storeId: 'ikebukuro',
    castName: 'みるく',
    customerArea: '文京区',
    rating: 5,
    content:
      '今日は本当にありがとうございました！見た目も可愛くて、スタイルも良くて最高でした。マッサージも気持ち良くて、時間があっという間に過ぎました。',
    visitDate: new Date('2024-06-06'),
    courseType: '130分人気No.1コース',
    options: ['回春増し増し', 'オールヌード'],
    isVerified: true,
    helpful: 18,
    tags: ['容姿端麗', 'スタイル抜群', 'マッサージ上手'],
    createdAt: new Date('2024-06-06'),
    updatedAt: new Date('2024-06-06'),
  },
  {
    id: '4',
    storeId: 'ikebukuro',
    castName: 'ののか',
    customerArea: '板橋区',
    rating: 4,
    content:
      '優しく丁寧な接客で安心してお任せできました。睾丸マッサージは初めてでしたが、とても気持ち良かったです。',
    visitDate: new Date('2024-06-05'),
    courseType: '80分コース',
    isVerified: true,
    helpful: 8,
    tags: ['接客良好', '初心者向け', '睾丸マッサージ'],
    createdAt: new Date('2024-06-05'),
    updatedAt: new Date('2024-06-05'),
  },
  {
    id: '5',
    storeId: 'ikebukuro',
    castName: 'さくら',
    customerArea: '新宿区',
    rating: 5,
    content:
      'プロフィール通りの美人さんでした！トークも楽しく、技術も素晴らしくて大満足です。絶対リピートします！',
    visitDate: new Date('2024-06-04'),
    courseType: '150分コース',
    options: ['スキンフェラ', 'オイル増し増し'],
    isVerified: true,
    helpful: 22,
    tags: ['容姿端麗', 'トーク上手', 'リピート確定'],
    response: {
      content:
        'この度はご利用いただきありがとうございました。楽しんでいただけて本当に嬉しいです♪次回もお待ちしております！',
      respondedAt: new Date('2024-06-04'),
      respondedBy: 'さくら',
    },
    createdAt: new Date('2024-06-04'),
    updatedAt: new Date('2024-06-04'),
  },
  {
    id: '6',
    storeId: 'ikebukuro',
    castName: 'れい',
    customerArea: '豊島区',
    rating: 5,
    content: '密着度が半端ない！泡洗体も最高でした。こんなに癒されたのは初めてです。',
    visitDate: new Date('2024-06-03'),
    courseType: '110分人気No.2コース',
    options: ['オールヌード'],
    isVerified: true,
    helpful: 16,
    tags: ['密着サービス', '泡洗体', '癒し系'],
    createdAt: new Date('2024-06-03'),
    updatedAt: new Date('2024-06-03'),
  },
  {
    id: '7',
    storeId: 'ikebukuro',
    castName: 'ゆき',
    customerArea: '中野区',
    rating: 5,
    content:
      '前立腺マッサージをお願いしました。初めてでしたが優しく丁寧にしてくれて、新しい世界が開けました。',
    visitDate: new Date('2024-06-02'),
    courseType: '120分オススメコース',
    options: ['前立腺マッサージ', '密着洗髪スパ'],
    isVerified: true,
    helpful: 14,
    tags: ['前立腺マッサージ', '優しい', '技術高い'],
    createdAt: new Date('2024-06-02'),
    updatedAt: new Date('2024-06-02'),
  },
  {
    id: '8',
    storeId: 'ikebukuro',
    castName: 'みなみ',
    customerArea: '練馬区',
    rating: 4,
    content:
      'とても可愛い女の子でした。マッサージも上手で疲れが取れました。ただ時間が少し短く感じたので次は長めのコースにします。',
    visitDate: new Date('2024-06-01'),
    courseType: '70分お試しフリー限定',
    isVerified: true,
    helpful: 6,
    tags: ['容姿端麗', 'マッサージ上手', '時間短い'],
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-01'),
  },
  {
    id: '9',
    storeId: 'ikebukuro',
    castName: 'きこ',
    customerArea: '世田谷区',
    rating: 5,
    content:
      'Gカップの爆乳に圧倒されました！密着度も最高で、まさに天国でした。回春増し増しオプション最高です！',
    visitDate: new Date('2024-05-31'),
    courseType: '160分コース',
    options: ['回春増し増し', 'オールヌード', 'キス（フレンチ）'],
    isVerified: true,
    helpful: 25,
    tags: ['爆乳', '密着サービス', '回春マッサージ'],
    createdAt: new Date('2024-05-31'),
    updatedAt: new Date('2024-05-31'),
  },
  {
    id: '10',
    storeId: 'ikebukuro',
    castName: 'ひかる',
    customerArea: '豊島区',
    rating: 5,
    content:
      '新人さんとのことでしたが、とても頑張ってくれました。一生懸命な姿に癒されました。応援したくなる女の子です。',
    visitDate: new Date('2024-05-30'),
    courseType: '100分コース',
    options: ['癒やしの膝枕耳かき'],
    isVerified: true,
    helpful: 11,
    tags: ['新人', '一生懸命', '癒し系'],
    response: {
      content:
        '温かいお言葉ありがとうございます！まだまだ未熟ですが、これからも頑張ります。またお会いできるのを楽しみにしています♪',
      respondedAt: new Date('2024-05-30'),
      respondedBy: 'ひかる',
    },
    createdAt: new Date('2024-05-30'),
    updatedAt: new Date('2024-05-30'),
  },
  {
    id: '11',
    storeId: 'ikebukuro',
    castName: 'ことね',
    customerArea: '杉並区',
    rating: 5,
    content:
      'ランキング1位なだけあって最高でした！Gカップの破壊力とテクニックの両方を兼ね備えた女神です。',
    visitDate: new Date('2024-05-29'),
    courseType: '190分コース',
    options: ['オールヌード', 'スキンフェラ', 'キス（フレンチ）'],
    isVerified: true,
    helpful: 30,
    tags: ['ランキング1位', '爆乳', 'テクニシャン'],
    createdAt: new Date('2024-05-29'),
    updatedAt: new Date('2024-05-29'),
  },
  {
    id: '12',
    storeId: 'ikebukuro',
    castName: 'ゆりこ',
    customerArea: '新宿区',
    rating: 4,
    content:
      '初めての利用でしたが、優しくリードしてくれました。密着洗髪スパが気持ち良すぎて寝そうになりました。',
    visitDate: new Date('2024-05-28'),
    courseType: '70分お試しフリー限定',
    options: ['密着洗髪スパ', 'オイル増し増し'],
    isVerified: true,
    helpful: 5,
    tags: ['初回利用', '優しい', 'リラックス'],
    createdAt: new Date('2024-05-28'),
    updatedAt: new Date('2024-05-28'),
  },
  {
    id: '13',
    storeId: 'ikebukuro',
    castName: 'せな',
    customerArea: '品川区',
    rating: 5,
    content: '32歳の大人の魅力たっぷり！話も楽しくて、マッサージも本格的。延長してしまいました。',
    visitDate: new Date('2024-05-27'),
    courseType: '120分オススメコース',
    options: ['延長30分', '回春増し増し'],
    isVerified: true,
    helpful: 19,
    tags: ['大人の魅力', 'トーク上手', 'マッサージ上手'],
    createdAt: new Date('2024-05-27'),
    updatedAt: new Date('2024-05-27'),
  },
  {
    id: '14',
    storeId: 'ikebukuro',
    castName: 'みるく',
    customerArea: '目黒区',
    rating: 5,
    content: '20歳とは思えない技術力！可愛さとエロさの両方を持ち合わせていて、まさに理想的です。',
    visitDate: new Date('2024-05-26'),
    courseType: '150分コース',
    options: ['パンスト', '前立腺マッサージ'],
    isVerified: true,
    helpful: 21,
    tags: ['若い', 'テクニシャン', '可愛い'],
    createdAt: new Date('2024-05-26'),
    updatedAt: new Date('2024-05-26'),
  },
  {
    id: '15',
    storeId: 'ikebukuro',
    castName: 'すずか',
    customerArea: '渋谷区',
    rating: 5,
    content: '3回目の利用です。毎回期待を超えてきます。今日も最高でした！',
    visitDate: new Date('2024-05-25'),
    courseType: '130分人気No.1コース',
    options: ['オールヌード', '回春増し増し'],
    isVerified: true,
    helpful: 16,
    tags: ['リピーター', '期待以上', '安定感'],
    response: {
      content:
        'いつもありがとうございます♪リピートしていただけて本当に嬉しいです！次回も全力で頑張りますね♡',
      respondedAt: new Date('2024-05-25'),
      respondedBy: 'すずか',
    },
    createdAt: new Date('2024-05-25'),
    updatedAt: new Date('2024-05-25'),
  },
]

export function getReviewsByStoreId(storeId: string): Review[] {
  return reviewsData.filter((review) => review.storeId === storeId)
}

export function getReviewStats(storeId: string): ReviewStats {
  const storeReviews = getReviewsByStoreId(storeId)

  const ratingDistribution = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  }

  let totalRating = 0
  storeReviews.forEach((review) => {
    ratingDistribution[review.rating as keyof typeof ratingDistribution]++
    totalRating += review.rating
  })

  const tagCounts: Record<string, number> = {}
  storeReviews.forEach((review) => {
    review.tags?.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1
    })
  })

  const popularTags = Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    totalReviews: storeReviews.length,
    averageRating: storeReviews.length > 0 ? totalRating / storeReviews.length : 0,
    ratingDistribution,
    popularTags,
  }
}

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const SALT_ROUNDS = 10

async function main() {
  console.log('🌱 開始: フルデモデータのシード...')

  // 1. 管理者ユーザー
  console.log('\n👥 管理者ユーザーを作成中...')
  const adminPassword = await bcrypt.hash('admin123', SALT_ROUNDS)
  await prisma.admin.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      name: '初期管理者',
      role: 'super_admin',
      permissions: JSON.stringify(['*']),
      isActive: true,
    },
  })

  // 2. コース料金
  console.log('\n💴 コース料金を作成中...')
  const courses = await Promise.all([
    prisma.coursePrice.create({
      data: {
        name: 'ショートコース',
        duration: 30,
        price: 5000,
        storeShare: 3000,
        castShare: 2000,
        description: 'お急ぎの方向けの短時間コース',
      },
    }),
    prisma.coursePrice.create({
      data: {
        name: 'スタンダードコース',
        duration: 60,
        price: 10000,
        storeShare: 6000,
        castShare: 4000,
        description: '一番人気の標準コース',
      },
    }),
    prisma.coursePrice.create({
      data: {
        name: 'ロングコース',
        duration: 90,
        price: 15000,
        storeShare: 9000,
        castShare: 6000,
        description: 'ゆったりとした時間を過ごしたい方向け',
      },
    }),
    prisma.coursePrice.create({
      data: {
        name: 'VIPコース',
        duration: 120,
        price: 25000,
        storeShare: 15000,
        castShare: 10000,
        description: '特別な時間をお過ごしいただける最高級コース',
      },
    }),
  ])

  // 3. オプション
  console.log('\n🎁 オプションを作成中...')
  const options = await Promise.all([
    prisma.optionPrice.create({
      data: {
        name: '指名料',
        price: 2000,
        storeShare: 1200,
        castShare: 800,
      },
    }),
    prisma.optionPrice.create({
      data: {
        name: '延長30分',
        price: 5000,
        storeShare: 3000,
        castShare: 2000,
      },
    }),
    prisma.optionPrice.create({
      data: {
        name: 'ドリンクサービス',
        price: 1000,
        storeShare: 600,
        castShare: 400,
      },
    }),
    prisma.optionPrice.create({
      data: {
        name: 'アロマオイル',
        price: 3000,
        storeShare: 1800,
        castShare: 1200,
      },
    }),
  ])

  // 4. キャスト
  console.log('\n👩 キャストを作成中...')
  const castData = [
    {
      name: '佐藤 はなこ',
      age: 25,
      height: 165,
      bust: 'C',
      waist: 60,
      hip: 88,
      type: '清楚系',
      image: '/placeholder-user.jpg',
      description: 'お客様に癒やしの時間を提供します。',
      netReservation: true,
      workStatus: '出勤',
      panelDesignationRank: 1,
      regularDesignationRank: 1,
    },
    {
      name: '山田 美咲',
      age: 23,
      height: 160,
      bust: 'D',
      waist: 58,
      hip: 86,
      type: '妹系',
      image: '/placeholder-user.jpg',
      description: '明るく元気な接客を心がけています！',
      netReservation: true,
      workStatus: '出勤',
      panelDesignationRank: 2,
      regularDesignationRank: 3,
    },
    {
      name: '鈴木 あやか',
      age: 28,
      height: 170,
      bust: 'C',
      waist: 62,
      hip: 90,
      type: 'お姉さん系',
      image: '/placeholder-user.jpg',
      description: '大人の魅力でおもてなしします。',
      netReservation: true,
      workStatus: '出勤',
      panelDesignationRank: 3,
      regularDesignationRank: 2,
    },
    {
      name: '田中 りお',
      age: 22,
      height: 158,
      bust: 'B',
      waist: 56,
      hip: 84,
      type: 'ロリ系',
      image: '/placeholder-user.jpg',
      description: '初心者の方も安心してご利用ください♪',
      netReservation: true,
      workStatus: '未出勤',
      panelDesignationRank: 5,
      regularDesignationRank: 4,
    },
    {
      name: '高橋 えみり',
      age: 26,
      height: 168,
      bust: 'E',
      waist: 65,
      hip: 92,
      type: 'グラマー系',
      image: '/placeholder-user.jpg',
      description: '心を込めたサービスでお迎えします。',
      netReservation: false,
      workStatus: '出勤',
      panelDesignationRank: 4,
      regularDesignationRank: 5,
    },
  ]

  const casts = await Promise.all(
    castData.map((data) => prisma.cast.create({ data: { ...data, images: [] } }))
  )

  // 5. 顧客
  console.log('\n👤 顧客を作成中...')
  const customerPassword = await bcrypt.hash('password123', SALT_ROUNDS)
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        email: 'tanaka@example.com',
        password: customerPassword,
        name: '田中 太郎',
        nameKana: 'タナカ タロウ',
        phone: '09012345678',
        birthDate: new Date('1990-01-01'),
        memberType: 'vip',
        points: 1500,
      },
    }),
    prisma.customer.create({
      data: {
        email: 'suzuki@example.com',
        password: customerPassword,
        name: '鈴木 一郎',
        nameKana: 'スズキ イチロウ',
        phone: '09023456789',
        birthDate: new Date('1985-05-15'),
        memberType: 'regular',
        points: 500,
      },
    }),
    prisma.customer.create({
      data: {
        email: 'sato@example.com',
        password: customerPassword,
        name: '佐藤 健',
        nameKana: 'サトウ ケン',
        phone: '09034567890',
        birthDate: new Date('1992-08-20'),
        memberType: 'regular',
        points: 300,
      },
    }),
  ])

  // 6. 予約
  console.log('\n📅 予約を作成中...')
  const now = new Date()
  const reservations = []

  // 過去の予約
  for (let i = 0; i < 10; i++) {
    const startTime = new Date(now)
    startTime.setDate(startTime.getDate() - (i + 1))
    startTime.setHours(14 + (i % 8), 0, 0, 0)

    const course = courses[i % courses.length]
    const endTime = new Date(startTime.getTime() + course.duration * 60000)

    const reservation = await prisma.reservation.create({
      data: {
        customerId: customers[i % customers.length].id,
        castId: casts[i % casts.length].id,
        courseId: course.id,
        startTime,
        endTime,
        status: 'completed',
        options: {
          create:
            i % 2 === 0
              ? [
                  {
                    optionId: options[0].id, // 指名料
                  },
                ]
              : undefined,
        },
      },
    })
    reservations.push(reservation)
  }

  // 今後の予約
  for (let i = 0; i < 5; i++) {
    const startTime = new Date(now)
    startTime.setDate(startTime.getDate() + (i + 1))
    startTime.setHours(15 + (i % 6), 0, 0, 0)

    const course = courses[i % courses.length]
    const endTime = new Date(startTime.getTime() + course.duration * 60000)

    await prisma.reservation.create({
      data: {
        customerId: customers[i % customers.length].id,
        castId: casts[i % casts.length].id,
        courseId: course.id,
        startTime,
        endTime,
        status: 'confirmed',
      },
    })
  }

  // 7. レビュー
  console.log('\n⭐ レビューを作成中...')
  for (let i = 0; i < 5; i++) {
    await prisma.review.create({
      data: {
        customerId: customers[i % customers.length].id,
        castId: casts[i % casts.length].id,
        rating: 4 + (i % 2),
        comment: [
          'とても良いサービスでした。また利用したいです。',
          '癒されました。スタッフの対応も素晴らしかったです。',
          '期待以上の時間を過ごせました。',
          'プロフェッショナルな接客で満足です。',
          'リラックスできる雰囲気でした。',
        ][i],
      },
    })
  }

  // 8. キャストのスケジュール
  console.log('\n📆 キャストスケジュールを作成中...')
  for (const cast of casts) {
    for (let i = 0; i < 7; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() + i)
      date.setHours(0, 0, 0, 0)

      const startTime = new Date(date)
      startTime.setHours(10, 0, 0, 0)

      const endTime = new Date(date)
      endTime.setHours(22, 0, 0, 0)

      await prisma.castSchedule.create({
        data: {
          castId: cast.id,
          date,
          startTime,
          endTime,
          isAvailable: cast.workStatus === '出勤' && i < 5, // 平日のみ出勤
        },
      })
    }
  }

  console.log('\n✅ シード完了！')
  console.log('\n📊 作成されたデータ:')
  console.log(`- 管理者: 3名`)
  console.log(`- キャスト: ${casts.length}名`)
  console.log(`- 顧客: ${customers.length}名`)
  console.log(`- コース: ${courses.length}種類`)
  console.log(`- オプション: ${options.length}種類`)
  console.log(`- 予約: 15件`)
  console.log(`- レビュー: 5件`)

  console.log('\n🔑 ログイン情報:')
  console.log('管理者: admin@example.com / admin123')
  console.log('顧客: tanaka@example.com / password123')
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

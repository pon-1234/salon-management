// @ts-nocheck
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { env } from '../lib/config/env'
import { DEFAULT_DESIGNATION_FEES } from '../lib/designation/fees'

const prisma = new PrismaClient()
const SALT_ROUNDS = 10

async function main() {
  console.log('Start seeding...')

  // 1. Create initial admin user
  const adminPassword = await bcrypt.hash(
    env.seed.initialAdminPassword || 'admin123',
    SALT_ROUNDS
  )
  const admin = await prisma.admin.upsert({
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
  console.log(`Created/Updated admin: ${admin.email} (Please change the password!)`)

  // 2. Create or update a customer
  const hashedPassword = await bcrypt.hash('password123', SALT_ROUNDS)
  const customerId = 'seed-customer-001'
  const customerPhone = '09012345678'
  const customerEmail = 'customer1@example.com'
  const customer = await prisma.customer.upsert({
    where: { phone: customerPhone },
    update: {
      name: '田中 太郎',
      nameKana: 'タナカ タロウ',
      phone: customerPhone,
      birthDate: new Date('1990-01-01T00:00:00Z'),
      memberType: 'regular',
      points: 1000,
      email: customerEmail,
    },
    create: {
      id: customerId,
      email: customerEmail,
      password: hashedPassword,
      name: '田中 太郎',
      nameKana: 'タナカ タロウ',
      phone: customerPhone,
      birthDate: new Date('1990-01-01T00:00:00Z'),
      memberType: 'regular',
      points: 1000,
    },
  })
  console.log(`Created/Updated customer: ${customer.name} (ID: ${customer.id})`)

  // 2. Create or update a cast
  const cast = await prisma.cast.upsert({
    where: { id: 'seed-cast-001' },
    update: {
      name: '佐藤 はなこ',
      age: 25,
      height: 165,
      bust: 'C',
      waist: 60,
      hip: 88,
      type: '清楚系',
      image: '/placeholder-user.jpg',
      images: [],
      description: 'お客様に癒やしの時間を提供します。',
      netReservation: true,
      workStatus: '出勤',
      panelDesignationRank: 1,
      regularDesignationRank: 1,
    },
    create: {
      id: 'seed-cast-001',
      name: '佐藤 はなこ',
      age: 25,
      height: 165,
      bust: 'C',
      waist: 60,
      hip: 88,
      type: '清楚系',
      image: '/placeholder-user.jpg',
      images: [],
      description: 'お客様に癒やしの時間を提供します。',
      netReservation: true,
      workStatus: '出勤',
      panelDesignationRank: 1,
      regularDesignationRank: 1,
    },
  })
  console.log(`Created/Updated cast: ${cast.name} (ID: ${cast.id})`)

  // 3. Create more admin users with different roles
  const managerPassword = await bcrypt.hash('manager123', SALT_ROUNDS)
  const manager = await prisma.admin.upsert({
    where: { email: 'manager@example.com' },
    update: {},
    create: {
      email: 'manager@example.com',
      password: managerPassword,
      name: '店舗マネージャー',
      role: 'manager',
      permissions: JSON.stringify([
        'cast:*',
        'customer:read',
        'reservation:*',
        'analytics:read',
        'dashboard:view',
      ]),
      isActive: true,
    },
  })
  console.log(`Created/Updated manager: ${manager.email}`)

  const staffPassword = await bcrypt.hash('staff123', SALT_ROUNDS)
  const staff = await prisma.admin.upsert({
    where: { email: 'staff@example.com' },
    update: {},
    create: {
      email: 'staff@example.com',
      password: staffPassword,
      name: 'スタッフ',
      role: 'staff',
      permissions: JSON.stringify(['cast:read', 'customer:read', 'reservation:read']),
      isActive: true,
    },
  })
  console.log(`Created/Updated staff: ${staff.email}`)

  const courseSeeds = [
    { id: 'course-1', name: '60分', adminName: '60分', price: 16000, storeShare: 8000, duration: 60, sort: 1, show: true, web: false, king: false },
    { id: 'course-2', name: '80分', adminName: '80分', price: 21000, storeShare: 11000, duration: 80, sort: 2, show: true, web: true, king: false },
    { id: 'course-3', name: '100分', adminName: '100分', price: 26000, storeShare: 14000, duration: 100, sort: 3, show: true, web: true, king: false },
    { id: 'course-4', name: '120分', adminName: '120分', price: 32000, storeShare: 17000, duration: 120, sort: 4, show: true, web: true, king: false },
    { id: 'course-5', name: '150分', adminName: '150分', price: 39000, storeShare: 20000, duration: 150, sort: 5, show: true, web: true, king: false },
    { id: 'course-6', name: '180分', adminName: '180分', price: 46000, storeShare: 24000, duration: 180, sort: 6, show: true, web: true, king: false },
    { id: 'course-7', name: 'イベント70分', adminName: 'イベント70分', price: 16000, storeShare: 8000, duration: 70, sort: 7, show: true, web: false, king: false },
    { id: 'course-8', name: 'イベント90分', adminName: 'イベント90分', price: 20000, storeShare: 10000, duration: 90, sort: 8, show: true, web: false, king: false },
    { id: 'course-9', name: 'イベント110分', adminName: 'イベント110分', price: 25000, storeShare: 13000, duration: 110, sort: 9, show: true, web: false, king: false },
    { id: 'course-10', name: 'イベント130分', adminName: 'イベント130分', price: 30000, storeShare: 16000, duration: 130, sort: 10, show: true, web: false, king: false },
    { id: 'course-11', name: 'イベント160分', adminName: 'イベント160分', price: 36000, storeShare: 19000, duration: 160, sort: 11, show: true, web: false, king: false },
    { id: 'course-12', name: 'イベント190分', adminName: 'イベント190分', price: 42000, storeShare: 22000, duration: 190, sort: 12, show: true, web: false, king: false },
    { id: 'course-13', name: '延長30分', adminName: '延長30分', price: 8000, storeShare: 4000, duration: 30, sort: 13, show: true, web: false, king: false },
  ]

  const courseRecords = await Promise.all(
    courseSeeds.map((course) =>
      prisma.coursePrice.upsert({
        where: { id: course.id },
        update: {
          name: course.name,
          duration: course.duration,
          price: course.price,
          storeShare: course.storeShare,
          castShare: course.price - course.storeShare,
          description: `管理用名称: ${course.adminName} / 表示順: ${course.sort} / WEB表示: ${course.web ? '有効' : '無効'} / 王様コース: ${course.king ? 'はい' : 'いいえ'}`,
          isActive: course.show,
          archivedAt: null,
        },
        create: {
          id: course.id,
          name: course.name,
          duration: course.duration,
          price: course.price,
          storeShare: course.storeShare,
          castShare: course.price - course.storeShare,
          description: `管理用名称: ${course.adminName} / 表示順: ${course.sort} / WEB表示: ${course.web ? '有効' : '無効'} / 王様コース: ${course.king ? 'はい' : 'いいえ'}`,
          isActive: course.show,
          archivedAt: null,
        },
      })
    )
  )

  console.log(`Upserted ${courseRecords.length} course records`)

  const serviceOptions = [
    { id: 'option-service-1', kind: 0, sort: 1, name: '癒しの膝枕耳かき', price: 0, castShare: 0, level: 0, levelAdmin: 1 },
    { id: 'option-service-2', kind: 0, sort: 2, name: '密着洗髪スパ', price: 0, castShare: 0, level: 0, levelAdmin: 1 },
    { id: 'option-service-3', kind: 0, sort: 3, name: 'オイル増し増し', price: 0, castShare: 0, level: 0, levelAdmin: 1 },
    { id: 'option-service-4', kind: 0, sort: 4, name: '密着顔面騎乗', price: 0, castShare: 0, level: 0, levelAdmin: 0 },
  ]

  const paidOptions = [
    { id: 'option-paid-1', sort: 1, name: 'キス（フレンチ）', price: 1000, castShare: 1000, level: 1, levelAdmin: 1 },
    { id: 'option-paid-2', sort: 2, name: 'パンスト', price: 1000, castShare: 1000, level: 1, levelAdmin: 1 },
    { id: 'option-paid-3', sort: 3, name: '亀頭デンマ', price: 1000, castShare: 1000, level: 0, levelAdmin: 0 },
    { id: 'option-paid-4', sort: 4, name: '回春増し増し', price: 2000, castShare: 2000, level: 1, levelAdmin: 1 },
    { id: 'option-paid-5', sort: 5, name: '前立腺マッサージ', price: 2000, castShare: 2000, level: 1, levelAdmin: 1 },
    { id: 'option-paid-6', sort: 6, name: 'オールヌード', price: 3000, castShare: 3000, level: 1, levelAdmin: 1 },
    { id: 'option-paid-7', sort: 7, name: 'スキン（ゴム）フェラ', price: 3000, castShare: 3000, level: 1, levelAdmin: 1 },
  ]

  const optionSeeds = [...serviceOptions, ...paidOptions]

  const optionRecords = await Promise.all(
    optionSeeds.map((option) => {
      const isPaid = option.id.startsWith('option-paid')
      const displayOrder = isPaid
        ? serviceOptions.length + option.sort
        : option.sort
      const storeShare = option.price - option.castShare
      return prisma.optionPrice.upsert({
        where: { id: option.id },
        update: {
          name: option.name,
          description: null,
          price: option.price,
          duration: null,
          category: isPaid ? 'paid' : 'service',
          displayOrder,
          isActive: option.levelAdmin > 0,
          note: `レベル: ${option.level}, 管理レベル: ${option.levelAdmin}`,
          storeShare,
          castShare: option.castShare,
          archivedAt: null,
        },
        create: {
          id: option.id,
          name: option.name,
          description: null,
          price: option.price,
          duration: null,
          category: isPaid ? 'paid' : 'service',
          displayOrder,
          isActive: option.levelAdmin > 0,
          note: `レベル: ${option.level}, 管理レベル: ${option.levelAdmin}`,
          storeShare,
          castShare: option.castShare,
          archivedAt: null,
        },
      })
    })
  )

  console.log(`Upserted ${optionRecords.length} option records`)

  const designationRecords = await Promise.all(
    DEFAULT_DESIGNATION_FEES.map((fee, index) =>
      prisma.designationFee.upsert({
        where: { id: fee.id },
        update: {
          name: fee.name,
          price: fee.price,
          storeShare: fee.storeShare,
          castShare: fee.castShare,
          description: fee.description ?? null,
          sortOrder: fee.sortOrder ?? index + 1,
          isActive: fee.isActive,
        },
        create: {
          id: fee.id,
          name: fee.name,
          price: fee.price,
          storeShare: fee.storeShare,
          castShare: fee.castShare,
          description: fee.description ?? null,
          sortOrder: fee.sortOrder ?? index + 1,
          isActive: fee.isActive,
        },
      })
    )
  )

  console.log(`Upserted ${designationRecords.length} designation fee records`)

  // 4. Create a reservation
  const defaultCourse =
    courseRecords.find((record) => record.id === 'course-1') ?? courseRecords[0]

  const startTime = new Date()
  startTime.setHours(startTime.getHours() + 1, 0, 0, 0) // Start in 1 hour
  const endTime = new Date(startTime.getTime() + defaultCourse.duration * 60000)

  await prisma.reservation.upsert({
    where: { id: 'seed-reservation-001' },
    update: {
      customerId: customer.id,
      castId: cast.id,
      courseId: defaultCourse.id,
      startTime,
      endTime,
      status: 'confirmed',
      price: defaultCourse.price,
    },
    create: {
      id: 'seed-reservation-001',
      customerId: customer.id,
      castId: cast.id,
      courseId: defaultCourse.id,
      startTime,
      endTime,
      status: 'confirmed',
      price: defaultCourse.price,
    },
  })
  console.log(`Created/Updated reservation for ${customer.name} with ${cast.name}`)

  console.log('Seeding finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

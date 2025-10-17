import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { env } from '../lib/config/env'

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
  const customer = await prisma.customer.upsert({
    where: { email: 'customer1@example.com' },
    update: {
      name: '田中 太郎',
      nameKana: 'タナカ タロウ',
      phone: '09012345678',
      birthDate: new Date('1990-01-01T00:00:00Z'),
      memberType: 'regular',
      points: 1000,
    },
    create: {
      id: 'seed-customer-001',
      email: 'customer1@example.com',
      password: hashedPassword,
      name: '田中 太郎',
      nameKana: 'タナカ タロウ',
      phone: '09012345678',
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
      permissions: JSON.stringify(['cast:*', 'customer:read', 'reservation:*', 'analytics:read']),
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

  // 4. Create a course
  const course = await prisma.coursePrice.upsert({
    where: { id: 'seed-course-standard-60' },
    update: {
      name: 'スタンダードコース',
      duration: 60,
      price: 10000,
      storeShare: 6000,
      castShare: 4000,
      description: '基本的なコースです。',
      isActive: true,
      archivedAt: null,
    },
    create: {
      id: 'seed-course-standard-60',
      name: 'スタンダードコース',
      duration: 60,
      price: 10000,
      storeShare: 6000,
      castShare: 4000,
      description: '基本的なコースです。',
      isActive: true,
      archivedAt: null,
    },
  })
  console.log(`Created/Updated course: ${course.name} (ID: ${course.id})`)

  // 4. Create a reservation
  const startTime = new Date()
  startTime.setHours(startTime.getHours() + 1, 0, 0, 0) // Start in 1 hour
  const endTime = new Date(startTime.getTime() + course.duration * 60000)

  await prisma.reservation.upsert({
    where: { id: 'seed-reservation-001' },
    update: {
      customerId: customer.id,
      castId: cast.id,
      courseId: course.id,
      startTime,
      endTime,
      status: 'confirmed',
      price: course.price,
    },
    create: {
      id: 'seed-reservation-001',
      customerId: customer.id,
      castId: cast.id,
      courseId: course.id,
      startTime,
      endTime,
      status: 'confirmed',
      price: course.price,
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

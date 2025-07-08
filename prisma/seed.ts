import { PrismaClient } from '../lib/generated/prisma/index.js';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function main() {
  console.log('Start seeding...');

  // 1. Create a customer
  const hashedPassword = await bcrypt.hash('password123', SALT_ROUNDS);
  const customer = await prisma.customer.create({
    data: {
      email: 'customer1@example.com',
      password: hashedPassword,
      name: '田中 太郎',
      nameKana: 'タナカ タロウ',
      phone: '09012345678',
      birthDate: new Date('1990-01-01T00:00:00Z'),
    },
  });
  console.log(`Created customer: ${customer.name} (ID: ${customer.id})`);

  // 2. Create a cast
  const cast = await prisma.cast.create({
    data: {
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
  });
  console.log(`Created cast: ${cast.name} (ID: ${cast.id})`);

  // 3. Create a course
  const course = await prisma.coursePrice.create({
    data: {
      name: 'スタンダードコース',
      duration: 60,
      price: 10000,
      description: '基本的なコースです。',
    },
  });
  console.log(`Created course: ${course.name} (ID: ${course.id})`);

  // 4. Create a reservation
  const startTime = new Date();
  startTime.setHours(startTime.getHours() + 1, 0, 0, 0); // Start in 1 hour
  const endTime = new Date(startTime.getTime() + course.duration * 60000);

  const reservation = await prisma.reservation.create({
    data: {
      customerId: customer.id,
      castId: cast.id,
      courseId: course.id,
      startTime: startTime,
      endTime: endTime,
      status: 'confirmed',
    },
  });
  console.log(`Created reservation for ${customer.name} with ${cast.name}`);

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding chat messages...')

  // Get existing customers
  const customers = await prisma.customer.findMany({
    take: 3,
  })

  if (customers.length === 0) {
    console.log('No customers found. Please run the main seed script first.')
    return
  }

  // Create sample messages for each customer
  for (const customer of customers) {
    const messages = [
      {
        customerId: customer.id,
        sender: 'customer',
        content: 'こんにちは。予約について質問があります。',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        readStatus: '既読',
      },
      {
        customerId: customer.id,
        sender: 'staff',
        content: 'お問い合わせありがとうございます。どのようなご質問でしょうか？',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 23), // 23 hours ago
        readStatus: '既読',
      },
      {
        customerId: customer.id,
        sender: 'customer',
        content: '明日の15時に予約を取りたいのですが、空いていますか？',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 22), // 22 hours ago
        readStatus: '既読',
      },
      {
        customerId: customer.id,
        sender: 'staff',
        content: '確認いたしました。明日の15時でご予約をお取りしました。',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 21), // 21 hours ago
        readStatus: '既読',
        isReservationInfo: true,
        reservationInfo: {
          date: '2024年12月24日',
          time: '15:00',
          confirmedDate: new Date(Date.now() - 1000 * 60 * 60 * 21).toISOString(),
        },
      },
      {
        customerId: customer.id,
        sender: 'customer',
        content: 'ありがとうございます！よろしくお願いします。',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        readStatus: '未読',
      },
    ]

    for (const message of messages) {
      await prisma.message.create({
        data: message,
      })
    }

    console.log(`Created messages for customer: ${customer.name}`)
  }

  console.log('Chat messages seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

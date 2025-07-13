/**
 * @design_doc   Seed script for chat messages
 * @related_to   Message model, Customer model
 * @known_issues None
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding chat messages...')

  // Get existing customers
  const customers = await prisma.customer.findMany({
    take: 5,
  })

  if (customers.length === 0) {
    console.log('No customers found. Please seed customers first.')
    return
  }

  // Create sample messages for each customer
  const messages = []
  const now = new Date()

  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i]
    const baseTime = new Date(now.getTime() - i * 60 * 60 * 1000) // Stagger by hours

    // Create a conversation thread
    messages.push(
      {
        customerId: customer.id,
        sender: 'customer',
        content: `こんにちは。予約について質問があります。`,
        timestamp: new Date(baseTime.getTime() - 30 * 60 * 1000), // 30 min ago
        readStatus: '既読',
        isReservationInfo: false,
      },
      {
        customerId: customer.id,
        sender: 'staff',
        content: `お問い合わせありがとうございます。どのような内容でしょうか？`,
        timestamp: new Date(baseTime.getTime() - 25 * 60 * 1000), // 25 min ago
        readStatus: '既読',
        isReservationInfo: false,
      },
      {
        customerId: customer.id,
        sender: 'customer',
        content: `来週の予約を変更したいのですが可能でしょうか？`,
        timestamp: new Date(baseTime.getTime() - 20 * 60 * 1000), // 20 min ago
        readStatus: i === 0 ? '既読' : '未読', // First customer's messages are read
        isReservationInfo: false,
      }
    )

    // Add a reservation confirmation for some customers
    if (i % 2 === 0) {
      messages.push({
        customerId: customer.id,
        sender: 'staff',
        content: `予約を確認いたしました。以下の日時でお待ちしております。`,
        timestamp: new Date(baseTime.getTime() - 10 * 60 * 1000), // 10 min ago
        readStatus: '未読',
        isReservationInfo: true,
        reservationInfo: {
          date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          time: '14:00',
          confirmedDate: new Date().toISOString().split('T')[0],
        },
      })
    }
  }

  // Delete existing messages (for clean state)
  await prisma.message.deleteMany()

  // Insert new messages
  const createdMessages = await prisma.message.createMany({
    data: messages,
  })

  console.log(`Created ${createdMessages.count} messages`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

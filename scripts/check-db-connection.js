const { PrismaClient } = require('../lib/generated/prisma')

async function checkConnection() {
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  })

  try {
    console.log('Attempting to connect to database...')

    // Try to connect
    await prisma.$connect()
    console.log('✅ Database connection successful!')

    // Try a simple query
    const adminCount = await prisma.admin.count()
    console.log(`✅ Query successful! Admin count: ${adminCount}`)

    // Check if new columns exist
    const firstAdmin = await prisma.admin.findFirst()
    if (firstAdmin) {
      console.log('Admin columns:', Object.keys(firstAdmin))
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    console.error('Error details:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkConnection()

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    console.log('Creating admin user...')

    const hashedPassword = await bcrypt.hash('admin123', 10)

    const admin = await prisma.admin.upsert({
      where: { email: 'admin@example.com' },
      update: {
        password: hashedPassword,
        name: '初期管理者',
        role: 'super_admin',
        permissions: JSON.stringify(['*']),
        isActive: true,
      },
      create: {
        email: 'admin@example.com',
        password: hashedPassword,
        name: '初期管理者',
        role: 'super_admin',
        permissions: JSON.stringify(['*']),
        isActive: true,
      },
    })

    console.log('✅ Admin user created/updated:', admin.email)

    // 他の管理者も作成
    const managerPassword = await bcrypt.hash('manager123', 10)
    await prisma.admin.upsert({
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
    console.log('✅ Manager user created')

    const staffPassword = await bcrypt.hash('staff123', 10)
    await prisma.admin.upsert({
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
    console.log('✅ Staff user created')

    console.log('\n管理者アカウント:')
    console.log('1. admin@example.com / admin123 (スーパー管理者)')
    console.log('2. manager@example.com / manager123 (マネージャー)')
    console.log('3. staff@example.com / staff123 (スタッフ)')
  } catch (error) {
    console.error('❌ Error creating admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()

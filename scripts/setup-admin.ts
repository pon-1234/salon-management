/**
 * @design_doc   Admin user setup script
 * @related_to   lib/auth/config.ts, Admin model
 * @known_issues None currently
 */
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import readline from 'readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve)
  })
}

async function setupAdmin() {
  console.log('=== Admin Setup Script ===\n')

  try {
    // Check if admin already exists
    const existingAdmins = await db.admin.findMany()
    if (existingAdmins.length > 0) {
      console.log(`⚠️  Warning: ${existingAdmins.length} admin(s) already exist in the database.`)
      const proceed = await question('Do you want to create another admin? (y/N): ')
      if (proceed.toLowerCase() !== 'y') {
        console.log('Setup cancelled.')
        process.exit(0)
      }
    }

    // Get admin details
    const email = await question('Admin email: ')
    const name = await question('Admin name: ')
    const password = await question('Admin password (min 8 characters): ')

    // Validate input
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email address')
    }

    if (!name || name.trim().length === 0) {
      throw new Error('Name is required')
    }

    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long')
    }

    // Check for password strength
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    if (!(hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar)) {
      console.log('\n⚠️  Warning: Password should contain:')
      console.log('  - At least one uppercase letter')
      console.log('  - At least one lowercase letter')
      console.log('  - At least one number')
      console.log('  - At least one special character')
      
      const proceed = await question('\nDo you want to proceed with this password? (y/N): ')
      if (proceed.toLowerCase() !== 'y') {
        console.log('Setup cancelled.')
        process.exit(0)
      }
    }

    // Hash password
    console.log('\nHashing password...')
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create admin
    console.log('Creating admin user...')
    const admin = await db.admin.create({
      data: {
        email,
        name,
        password: hashedPassword
      }
    })

    console.log('\n✅ Admin user created successfully!')
    console.log(`   Email: ${admin.email}`)
    console.log(`   Name: ${admin.name}`)
    console.log(`   ID: ${admin.id}`)

    // Remind about environment variables
    console.log('\n📝 Important: Make sure to set the following environment variables:')
    console.log('   NEXTAUTH_SECRET=<your-secret-key-at-least-32-characters>')
    console.log('   NEXTAUTH_URL=<your-application-url>')

  } catch (error) {
    console.error('\n❌ Error creating admin:', error instanceof Error ? error.message : error)
    process.exit(1)
  } finally {
    rl.close()
    await db.$disconnect()
  }
}

// Run the setup
setupAdmin()
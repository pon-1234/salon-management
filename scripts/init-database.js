const { execSync } = require('child_process')

console.log('🔄 Initializing database...')

try {
  // Generate Prisma client
  console.log('📦 Generating Prisma client...')
  execSync('npx prisma generate', { stdio: 'inherit' })

  // Push schema to database (this will create tables if they don't exist)
  console.log('🗄️  Pushing schema to database...')
  execSync('npx prisma db push', {
    stdio: 'inherit',
    timeout: 300000, // 5 minutes timeout
  })

  console.log('✅ Database initialization complete!')
} catch (error) {
  console.error('❌ Database initialization failed:', error.message)
  process.exit(1)
}

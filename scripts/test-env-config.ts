import { env } from '../lib/config/env'

console.log('Checking LINE_CHANNEL_SECRET configuration...')

if (env.line.messaging.channelSecret === 'test_secret') {
    console.log('SUCCESS: LINE_CHANNEL_SECRET was correctly loaded.')
    process.exit(0)
} else {
    console.error('FAILURE: LINE_CHANNEL_SECRET was NOT loaded correctly.')
    console.error('Expected: test_secret')
    console.error('Actual:', env.line.messaging.channelSecret)
    process.exit(1)
}

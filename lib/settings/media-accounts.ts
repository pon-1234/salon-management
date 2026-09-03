/**
 * @design_doc   Notion task #281 centralized media credential management
 * @related_to   StoreSettings.mediaAccounts and media-info settings page
 * @known_issues Password recovery depends on NEXTAUTH_SECRET remaining unchanged
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

export type MediaCategory = 'sales' | 'recruitment'

export interface MediaAccountInput {
  id: string
  name: string
  category: MediaCategory
  publicUrl?: string
  adminUrl?: string
  loginId?: string
  password?: string
}

interface StoredMediaAccount extends Omit<MediaAccountInput, 'password'> {
  passwordCiphertext?: string
}

const keyFromSecret = (secret: string) => createHash('sha256').update(secret).digest()

export function encryptMediaAccounts(
  accounts: MediaAccountInput[],
  secret: string
): StoredMediaAccount[] {
  return accounts.map(({ password = '', ...account }) => {
    if (!password) return { ...account, passwordCiphertext: '' }
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', keyFromSecret(secret), iv)
    const encrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()
    return {
      ...account,
      passwordCiphertext: [iv, authTag, encrypted]
        .map((value) => value.toString('base64'))
        .join('.'),
    }
  })
}

export function decryptMediaAccounts(stored: unknown, secret: string): MediaAccountInput[] {
  if (!Array.isArray(stored)) return []
  return stored.flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') return []
    const account = candidate as StoredMediaAccount
    if (!account.id || !account.name || !['sales', 'recruitment'].includes(account.category)) {
      return []
    }
    let password = ''
    if (account.passwordCiphertext) {
      try {
        const [iv, authTag, encrypted] = account.passwordCiphertext
          .split('.')
          .map((value) => Buffer.from(value, 'base64'))
        const decipher = createDecipheriv('aes-256-gcm', keyFromSecret(secret), iv)
        decipher.setAuthTag(authTag)
        password = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
      } catch {
        password = ''
      }
    }
    const { passwordCiphertext: _passwordCiphertext, ...publicAccount } = account
    return [{ ...publicAccount, password }]
  })
}

export function mergeMediaNamesIntoMarketingCatalog(
  channels: string[],
  accounts: Array<Pick<MediaAccountInput, 'id' | 'name' | 'category'>>
): string[] {
  return Array.from(
    new Set([
      ...channels,
      ...accounts.filter(({ category }) => category === 'sales').map(({ name }) => name.trim()),
    ])
  ).filter(Boolean)
}

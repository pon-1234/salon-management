/**
 * @design_doc   Notion #281 centralized sales and recruitment media account management
 * @related_to   StoreSettings.mediaAccounts and the media-info administration page
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'
import {
  decryptMediaAccounts,
  encryptMediaAccounts,
  mergeMediaNamesIntoMarketingCatalog,
} from './media-accounts'

describe('media accounts', () => {
  it('encrypts passwords at rest and restores them for authorized administrators', () => {
    const input = [
      {
        id: 'heaven',
        name: 'Heaven',
        category: 'sales' as const,
        publicUrl: 'https://example.com/shop',
        adminUrl: 'https://example.com/admin',
        loginId: 'shop-user',
        password: 'secret-password',
      },
    ]

    const stored = encryptMediaAccounts(input, 'a'.repeat(32))

    expect(JSON.stringify(stored)).not.toContain('secret-password')
    expect(decryptMediaAccounts(stored, 'a'.repeat(32))).toEqual(input)
  })

  it('adds sales media names to reservation channels without adding recruitment media', () => {
    expect(
      mergeMediaNamesIntoMarketingCatalog(
        ['電話'],
        [
          { id: 'a', name: 'Heaven', category: 'sales' },
          { id: 'b', name: '求人サイト', category: 'recruitment' },
        ]
      )
    ).toEqual(['電話', 'Heaven'])
  })
})

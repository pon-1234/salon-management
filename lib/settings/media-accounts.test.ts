/**
 * @design_doc   Notion #281 centralized sales and recruitment media account management
 * @related_to   StoreSettings.mediaAccounts and the media-info administration page
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'
import {
  decryptMediaAccounts,
  encryptMediaAccounts,
  hydrateMediaAccountsFromMarketingCatalog,
  mergeMediaNamesIntoMarketingCatalog,
  moveMediaAccount,
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
          { id: 'c', name: '保留媒体', category: 'sales', isActive: false },
        ]
      )
    ).toEqual(['電話', 'Heaven'])
  })

  it('removes a paused media from current channels while retaining unrelated methods', () => {
    expect(
      mergeMediaNamesIntoMarketingCatalog(
        ['電話', '保留媒体'],
        [{ id: 'c', name: '保留媒体', category: 'sales', isActive: false }]
      )
    ).toEqual(['電話'])
  })

  it('imports current marketing channels without duplicating saved media', () => {
    expect(
      hydrateMediaAccountsFromMarketingCatalog(
        [{ id: 'saved', name: 'Heaven', category: 'sales' as const }],
        ['電話', 'Heaven', 'Infinity Talk']
      ).map(({ name, category }) => ({ name, category }))
    ).toEqual([
      { name: 'Heaven', category: 'sales' },
      { name: '電話', category: 'sales' },
      { name: 'Infinity Talk', category: 'sales' },
    ])
  })

  it('reorders media while preserving every account exactly once', () => {
    const accounts = [
      { id: 'a', name: 'A', category: 'sales' as const },
      { id: 'b', name: 'B', category: 'recruitment' as const },
      { id: 'c', name: 'C', category: 'store' as const },
    ]

    expect(moveMediaAccount(accounts, 'c', -1).map(({ id }) => id)).toEqual(['a', 'c', 'b'])
    expect(moveMediaAccount(accounts, 'a', -1)).toEqual(accounts)
  })
})

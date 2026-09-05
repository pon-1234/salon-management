/**
 * @design_doc   Notion task #281 shared media catalog behavior
 * @related_to   MediaInfoPage, MediaPage, and StoreSettings marketing channels
 * @known_issues None
 */

export type MediaCategory = 'sales' | 'recruitment' | 'store'

export interface MediaAccountInput {
  id: string
  name: string
  category: MediaCategory
  publicUrl?: string
  adminUrl?: string
  loginId?: string
  password?: string
  isActive?: boolean
  notes?: string
}

export function mergeMediaNamesIntoMarketingCatalog(
  channels: string[],
  accounts: Array<Pick<MediaAccountInput, 'id' | 'name' | 'category' | 'isActive'>>
): string[] {
  const paused = new Set(
    accounts.filter((account) => account.isActive === false).map((account) => account.name.trim())
  )
  const active = new Set(
    accounts
      .filter((account) => account.category === 'sales' && account.isActive !== false)
      .map((account) => account.name.trim())
  )
  return Array.from(
    new Set([
      ...channels.filter((channel) => !paused.has(channel) || active.has(channel)),
      ...active,
    ])
  ).filter(Boolean)
}

export function hydrateMediaAccountsFromMarketingCatalog(
  accounts: MediaAccountInput[],
  channels: string[]
): MediaAccountInput[] {
  const existingNames = new Set(accounts.map(({ name }) => name.trim()))
  const imported = channels
    .map((name) => name.trim())
    .filter((name) => name && !existingNames.has(name))
    .map((name, index) => ({
      id: `catalog-${index}-${encodeURIComponent(name)}`,
      name,
      category: 'sales' as const,
      publicUrl: '',
      adminUrl: '',
      loginId: '',
      password: '',
    }))
  return [...accounts, ...imported]
}

export function moveMediaAccount<T extends Pick<MediaAccountInput, 'id'>>(
  accounts: T[],
  id: string,
  offset: -1 | 1
): T[] {
  const sourceIndex = accounts.findIndex((account) => account.id === id)
  const targetIndex = sourceIndex + offset
  if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= accounts.length) return accounts
  const next = [...accounts]
  ;[next[sourceIndex], next[targetIndex]] = [next[targetIndex], next[sourceIndex]]
  return next
}

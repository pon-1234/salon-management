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

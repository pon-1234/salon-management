/**
 * @design_doc   Notion #281 course ordering synchronization
 * @related_to   CourseInfoPage and public/admin pricing readers
 * @known_issues None
 */
export type DisplayOrderedItem = { id: string; displayOrder?: number }

export function moveCatalogItem<T extends DisplayOrderedItem>(
  items: readonly T[],
  id: string,
  direction: 'up' | 'down'
): T[] {
  const ordered = items.map((item, index) => ({ ...item, displayOrder: index }))
  const currentIndex = ordered.findIndex((item) => item.id === id)
  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= ordered.length) return ordered
  const next = [...ordered]
  ;[next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]]
  return next.map((item, index) => ({ ...item, displayOrder: index }))
}

export function nextCatalogDisplayOrder(
  items: ReadonlyArray<Pick<DisplayOrderedItem, 'displayOrder'>>
): number {
  return items.reduce((maximum, item) => Math.max(maximum, item.displayOrder ?? -1), -1) + 1
}

/**
 * @design_doc   CAST-01 キャストリストをあいうえお順で安定表示する
 * @related_to   Cast list pages and /api/cast
 * @known_issues None
 */
export function sortCastsByGojuon<T extends { name: string; nameKana?: string | null }>(
  casts: readonly T[]
): T[] {
  return [...casts].sort((left, right) => compareByGojuon(left, right))
}

export function compareByGojuon(
  left: { name: string; nameKana?: string | null },
  right: { name: string; nameKana?: string | null }
): number {
  const leftKana = left.nameKana?.trim() ?? ''
  const rightKana = right.nameKana?.trim() ?? ''

  if (!leftKana && rightKana) return 1
  if (leftKana && !rightKana) return -1
  if (!leftKana && !rightKana) {
    return left.name.localeCompare(right.name, 'ja')
  }

  return leftKana.localeCompare(rightKana, 'ja') || left.name.localeCompare(right.name, 'ja')
}

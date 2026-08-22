/**
 * @design_doc   EXT-01 媒体コメント同期は手入力を消さない
 * @related_to   Cast.mediaComment, Cast.mediaSyncExcluded
 * @known_issues None
 */
export type MediaCommentSource = 'manual' | 'heaven' | 'benri' | 'official'

export function shouldApplyImportedMediaComment(input: {
  excluded: boolean
  overwriteEnabled: boolean
  existingComment: string | null | undefined
  existingSource: string | null | undefined
  incomingComment: string | null | undefined
}): boolean {
  if (input.excluded) {
    return false
  }
  const incoming = input.incomingComment?.trim() ?? ''
  if (!incoming) {
    return false
  }
  const existing = input.existingComment?.trim() ?? ''
  if (!existing) {
    return true
  }
  if (input.overwriteEnabled) {
    return true
  }
  return input.existingSource !== 'manual'
}

export function planMediaCommentImport(input: {
  overwriteEnabled: boolean
  source: MediaCommentSource
  casts: Array<{
    id: string
    mediaComment: string | null
    mediaCommentSource: string | null
    mediaSyncExcluded: boolean
  }>
  comments: Array<{ castId: string; comment: string }>
}): Array<{ id: string; mediaComment: string; mediaCommentSource: MediaCommentSource }> {
  const byId = new Map(input.casts.map((cast) => [cast.id, cast]))
  const updates: Array<{
    id: string
    mediaComment: string
    mediaCommentSource: MediaCommentSource
  }> = []

  for (const comment of input.comments) {
    const cast = byId.get(comment.castId)
    if (!cast) continue
    if (
      !shouldApplyImportedMediaComment({
        excluded: cast.mediaSyncExcluded,
        overwriteEnabled: input.overwriteEnabled,
        existingComment: cast.mediaComment,
        existingSource: cast.mediaCommentSource,
        incomingComment: comment.comment,
      })
    ) {
      continue
    }
    updates.push({
      id: cast.id,
      mediaComment: comment.comment.trim(),
      mediaCommentSource: input.source,
    })
  }

  return updates
}

/**
 * @design_doc   Notion task #282 cast gallery ordering
 * @related_to   CastForm persists the ordered images array
 * @known_issues None
 */
export function moveGalleryImage(
  images: readonly string[],
  index: number,
  offset: -1 | 1
): string[] {
  const destination = index + offset
  if (index < 0 || index >= images.length || destination < 0 || destination >= images.length) {
    return [...images]
  }

  const reordered = [...images]
  ;[reordered[index], reordered[destination]] = [reordered[destination], reordered[index]]
  return reordered
}

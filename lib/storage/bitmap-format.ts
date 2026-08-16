/**
 * @design_doc   docs/VPS_DEPLOYMENT.md supported local bitmap contract
 * @related_to   LocalStorageService validates uploads; salon-uploads route validates files before serving
 * @known_issues Animated bitmap dimensions and frame contents are not decoded
 */
export interface DetectedBitmapFormat {
  mimeType: 'image/gif' | 'image/jpeg' | 'image/png' | 'image/webp'
  extension: 'gif' | 'jpg' | 'png' | 'webp'
}

function startsWithBytes(contents: Buffer, signature: readonly number[]): boolean {
  return (
    contents.length >= signature.length &&
    signature.every((byte, index) => contents[index] === byte)
  )
}

export function detectBitmapFormat(contents: Buffer): DetectedBitmapFormat | null {
  if (startsWithBytes(contents, [0xff, 0xd8, 0xff])) {
    return { mimeType: 'image/jpeg', extension: 'jpg' }
  }

  if (startsWithBytes(contents, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mimeType: 'image/png', extension: 'png' }
  }

  if (
    contents.length >= 16 &&
    contents.toString('ascii', 0, 4) === 'RIFF' &&
    contents.toString('ascii', 8, 12) === 'WEBP' &&
    ['VP8 ', 'VP8L', 'VP8X'].includes(contents.toString('ascii', 12, 16))
  ) {
    return { mimeType: 'image/webp', extension: 'webp' }
  }

  const gifSignature = contents.toString('ascii', 0, 6)
  if (gifSignature === 'GIF87a' || gifSignature === 'GIF89a') {
    return { mimeType: 'image/gif', extension: 'gif' }
  }

  return null
}

export function normalizeBitmapMimeType(mimeType: string): string {
  const normalized = mimeType.trim().toLowerCase()
  return normalized === 'image/jpg' ? 'image/jpeg' : normalized
}

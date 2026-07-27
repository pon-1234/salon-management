/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md J-4 broken-image recovery
 * @related_to   StoreHomeContent and all image-rendering surfaces
 * @known_issues Remote image hosts are permitted by next.config.mjs and should be narrowed per deployment
 */
'use client'

import Image, { type ImageProps } from 'next/image'
import { forwardRef, type SyntheticEvent } from 'react'

export const DEFAULT_IMAGE_FALLBACK = '/images/non-photo.svg'

export interface SafeImageProps extends Omit<ImageProps, 'alt' | 'height' | 'onError' | 'width'> {
  alt: string
  fallbackSrc?: string
  height?: number
  onError?: (event: SyntheticEvent<HTMLImageElement>) => void
  width?: number
}

export const SafeImage = forwardRef<HTMLImageElement, SafeImageProps>(
  (
    { alt, fallbackSrc = DEFAULT_IMAGE_FALLBACK, height = 800, onError, width = 1200, ...props },
    ref
  ) => {
    const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
      onError?.(event)
      const image = event.currentTarget

      if (image.dataset.fallbackApplied === 'true') {
        return
      }

      image.dataset.fallbackApplied = 'true'
      image.setAttribute('src', fallbackSrc)
      image.removeAttribute('srcset')
    }

    return (
      <Image ref={ref} {...props} alt={alt} height={height} width={width} onError={handleError} />
    )
  }
)

SafeImage.displayName = 'SafeImage'

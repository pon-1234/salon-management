/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md J-4 broken-image recovery
 * @related_to   StoreHomeContent and all image-rendering surfaces
 * @known_issues Next.js image optimization is handled separately in phase 4
 */
'use client'

import { forwardRef, type ImgHTMLAttributes, type SyntheticEvent } from 'react'

export const DEFAULT_IMAGE_FALLBACK = '/images/non-photo.svg'

export interface SafeImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt'> {
  alt: string
  fallbackSrc?: string
}

export const SafeImage = forwardRef<HTMLImageElement, SafeImageProps>(
  ({ alt, fallbackSrc = DEFAULT_IMAGE_FALLBACK, onError, ...props }, ref) => {
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

    // eslint-disable-next-line @next/next/no-img-element
    return <img ref={ref} {...props} alt={alt} onError={handleError} />
  }
)

SafeImage.displayName = 'SafeImage'

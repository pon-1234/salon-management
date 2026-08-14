/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md J-4 broken-image recovery
 * @related_to   SafeImage is the shared image fallback used throughout the application
 * @known_issues None
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { SafeImage } from './safe-image'

describe('SafeImage', () => {
  it('replaces an unavailable image with the shared non-photo asset', () => {
    const onError = vi.fn()
    render(<SafeImage src="/missing.jpg" alt="プロフィール" onError={onError} />)

    const image = screen.getByRole('img', { name: 'プロフィール' })
    fireEvent.error(image)

    expect(onError).toHaveBeenCalledOnce()
    expect(image).toHaveAttribute('src', '/images/non-photo.svg')
  })

  it('does not retry when the fallback asset itself fails', () => {
    render(<SafeImage src="/missing.jpg" alt="プロフィール" />)

    const image = screen.getByRole('img', { name: 'プロフィール' })
    fireEvent.error(image)
    fireEvent.error(image)

    expect(image).toHaveAttribute('src', '/images/non-photo.svg')
  })

  it('loads reverse-proxied salon uploads directly instead of asking the Next optimizer to self-fetch them', () => {
    render(
      <SafeImage
        src="/salon-uploads/casts/ikebukuro/legacy-cast-56060/01-photo.jpg"
        alt="移行済みキャスト画像"
      />
    )

    const image = screen.getByRole('img', { name: '移行済みキャスト画像' })

    expect(
      image
        .getAttribute('src')
        ?.endsWith('/salon-uploads/casts/ikebukuro/legacy-cast-56060/01-photo.jpg')
    ).toBe(true)
    expect(image.getAttribute('src')).not.toContain('/_next/image')
    expect(image).not.toHaveAttribute('srcset')
  })

  it('supports fill-layout consumers without supplying conflicting fixed dimensions', () => {
    render(
      <div className="relative">
        <SafeImage src="/images/non-photo.svg" alt="全体表示" fill />
      </div>
    )

    expect(screen.getByRole('img', { name: '全体表示' })).toHaveAttribute('data-nimg', 'fill')
  })

  it('renders through the Next.js image optimizer', () => {
    const source = readFileSync(join(process.cwd(), 'components/ui/safe-image.tsx'), 'utf8')
    render(<SafeImage src="/images/example.jpg" alt="通常画像" />)

    expect(source).toContain("from 'next/image'")
    expect(source).not.toContain('<img')
    expect(screen.getByRole('img', { name: '通常画像' }).getAttribute('src')).toContain(
      '/_next/image'
    )
  })
})

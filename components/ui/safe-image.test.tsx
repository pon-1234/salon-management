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

  it('renders through the Next.js image optimizer', () => {
    const source = readFileSync(join(process.cwd(), 'components/ui/safe-image.tsx'), 'utf8')

    expect(source).toContain("from 'next/image'")
    expect(source).not.toContain('<img')
  })
})

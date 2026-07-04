'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

export interface BannerItem {
  id: string
  imageUrl: string
  mobileImageUrl?: string
  title: string
  link?: string
  external?: boolean
}

interface CampaignBannerSliderProps {
  banners: BannerItem[]
  autoPlayInterval?: number
  showDots?: boolean
  dismissible?: boolean
}

export function CampaignBannerSlider({
  banners,
  autoPlayInterval = 5000,
  showDots = true,
  dismissible = true,
}: CampaignBannerSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches)

    updatePreference()
    mediaQuery.addEventListener('change', updatePreference)
    return () => mediaQuery.removeEventListener('change', updatePreference)
  }, [])

  // Auto-play functionality
  useEffect(() => {
    if (!isPaused && !prefersReducedMotion && banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length)
      }, autoPlayInterval)

      return () => clearInterval(interval)
    }
  }, [currentIndex, isPaused, prefersReducedMotion, banners.length, autoPlayInterval])

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? banners.length - 1 : prevIndex - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length)
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
  }

  if (!isVisible || banners.length === 0) return null

  const currentBanner = banners[currentIndex]

  return (
    <section className="relative w-full border-y border-luxury-border-dark bg-[#141414] py-6">
      <div className="relative mx-auto max-w-6xl px-4">
        {/* Banner Container */}
        <div
          className="relative overflow-hidden border border-luxury-border bg-[#0f0f0f]"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocus={() => setIsPaused(true)}
          onBlur={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
        >
          {/* Dismiss Button */}
          {dismissible && (
            <button
              onClick={() => setIsVisible(false)}
              className="absolute right-4 top-4 z-20 rounded-full border border-luxury-gold-border/60 bg-black/50 p-2 text-luxury-gold backdrop-blur-sm transition-colors hover:bg-black/70"
              aria-label="バナーを閉じる"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Banner Image */}
          <div className="relative mx-auto aspect-[16/5] max-w-5xl">
            {currentBanner.link ? (
              <Link
                href={currentBanner.link}
                target={currentBanner.external ? '_blank' : undefined}
                rel={currentBanner.external ? 'noopener noreferrer' : undefined}
              >
                <picture>
                  {/* Mobile Image */}
                  {currentBanner.mobileImageUrl && (
                    <source media="(max-width: 768px)" srcSet={currentBanner.mobileImageUrl} />
                  )}
                  {/* Desktop Image */}
                  <img
                    src={currentBanner.imageUrl}
                    alt={currentBanner.title}
                    className="h-full w-full cursor-pointer object-cover"
                  />
                </picture>
              </Link>
            ) : (
              <picture>
                {/* Mobile Image */}
                {currentBanner.mobileImageUrl && (
                  <source media="(max-width: 768px)" srcSet={currentBanner.mobileImageUrl} />
                )}
                {/* Desktop Image */}
                <img
                  src={currentBanner.imageUrl}
                  alt={currentBanner.title}
                  className="h-full w-full object-cover"
                />
              </picture>
            )}
          </div>

          {/* Navigation Arrows - Only show if more than one banner */}
          {banners.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-luxury-gold-border/60 bg-black/60 p-2 text-luxury-gold backdrop-blur-sm transition-colors hover:bg-black/80"
                aria-label="前のバナーへ"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-luxury-gold-border/60 bg-black/60 p-2 text-luxury-gold backdrop-blur-sm transition-colors hover:bg-black/80"
                aria-label="次のバナーへ"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {/* Dots Indicator - Only show if more than one banner */}
        {showDots && banners.length > 1 && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-3 w-3 rounded-full transition-all ${
                  index === currentIndex
                    ? 'w-9 bg-luxury-gold'
                    : 'bg-luxury-gold/40 hover:bg-luxury-gold/70'
                }`}
                aria-label={`${index + 1}枚目のバナーへ`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

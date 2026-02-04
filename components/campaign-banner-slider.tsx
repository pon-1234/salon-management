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

  // Auto-play functionality
  useEffect(() => {
    if (!isPaused && banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length)
      }, autoPlayInterval)

      return () => clearInterval(interval)
    }
  }, [currentIndex, isPaused, banners.length, autoPlayInterval])

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
    <section className="relative w-full border-y border-[#2f2416] bg-[#141414] py-6">
      <div className="relative mx-auto max-w-6xl px-4">
        {/* Banner Container */}
        <div
          className="relative overflow-hidden border border-[#3b2e1f] bg-[#0f0f0f]"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Dismiss Button */}
          {dismissible && (
            <button
              onClick={() => setIsVisible(false)}
              className="absolute right-4 top-4 z-20 rounded-full border border-[#caa45a]/60 bg-black/50 p-2 text-[#f3d08a] backdrop-blur-sm transition-colors hover:bg-black/70"
              aria-label="Close banner"
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
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-[#caa45a]/60 bg-black/60 p-2 text-[#f3d08a] backdrop-blur-sm transition-colors hover:bg-black/80"
                aria-label="Previous banner"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-[#caa45a]/60 bg-black/60 p-2 text-[#f3d08a] backdrop-blur-sm transition-colors hover:bg-black/80"
                aria-label="Next banner"
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
                className={`h-2 w-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'w-8 bg-[#f3d08a]'
                    : 'bg-[#f3d08a]/40 hover:bg-[#f3d08a]/70'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

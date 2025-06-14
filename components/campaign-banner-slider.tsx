'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
  dismissible = true
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
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? banners.length - 1 : prevIndex - 1
    )
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
    <section className="relative w-full bg-gray-100">
      <div className="relative max-w-7xl mx-auto">
        {/* Banner Container */}
        <div 
          className="relative overflow-hidden"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Dismiss Button */}
          {dismissible && (
            <button
              onClick={() => setIsVisible(false)}
              className="absolute top-4 right-4 z-20 p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-colors"
              aria-label="Close banner"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          )}

          {/* Banner Image */}
          <div className="relative aspect-[4/1] md:aspect-[8/1]">
            {currentBanner.link ? (
              <Link 
                href={currentBanner.link}
                target={currentBanner.external ? '_blank' : undefined}
                rel={currentBanner.external ? 'noopener noreferrer' : undefined}
              >
                <picture>
                  {/* Mobile Image */}
                  {currentBanner.mobileImageUrl && (
                    <source 
                      media="(max-width: 768px)" 
                      srcSet={currentBanner.mobileImageUrl}
                    />
                  )}
                  {/* Desktop Image */}
                  <img
                    src={currentBanner.imageUrl}
                    alt={currentBanner.title}
                    className="w-full h-full object-cover cursor-pointer"
                  />
                </picture>
              </Link>
            ) : (
              <picture>
                {/* Mobile Image */}
                {currentBanner.mobileImageUrl && (
                  <source 
                    media="(max-width: 768px)" 
                    srcSet={currentBanner.mobileImageUrl}
                  />
                )}
                {/* Desktop Image */}
                <img
                  src={currentBanner.imageUrl}
                  alt={currentBanner.title}
                  className="w-full h-full object-cover"
                />
              </picture>
            )}
          </div>

          {/* Navigation Arrows - Only show if more than one banner */}
          {banners.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-colors"
                aria-label="Previous banner"
              >
                <ChevronLeft className="h-5 w-5 text-white" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-colors"
                aria-label="Next banner"
              >
                <ChevronRight className="h-5 w-5 text-white" />
              </button>
            </>
          )}
        </div>

        {/* Dots Indicator - Only show if more than one banner */}
        {showDots && banners.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex 
                    ? 'w-8 bg-white' 
                    : 'bg-white/50 hover:bg-white/70'
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
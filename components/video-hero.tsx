'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Phone, Volume2, VolumeX } from 'lucide-react'
import { Store } from '@/lib/store/types'

interface VideoHeroProps {
  store: Store
  videoUrl?: string
  posterUrl?: string
}

export function VideoHero({
  store,
  videoUrl = '/videos/hero-background.mp4',
  posterUrl,
}: VideoHeroProps) {
  const [isMuted, setIsMuted] = useState(true)
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)

  return (
    <section className="relative flex h-screen min-h-[600px] items-center justify-center overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        {/* Loading placeholder */}
        {!isVideoLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-700 to-pink-600" />
        )}

        <video
          autoPlay
          muted={isMuted}
          loop
          playsInline
          poster={posterUrl}
          onLoadedData={() => setIsVideoLoaded(true)}
          className="absolute h-full w-full object-cover"
        >
          <source src={videoUrl} type="video/mp4" />
          {/* You can add multiple sources for different formats */}
          <source src={videoUrl.replace('.mp4', '.webm')} type="video/webm" />

          {/* Fallback image for browsers that don't support video */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={posterUrl || '/images/hero-fallback.jpg'}
            alt="Hero background"
            className="absolute h-full w-full object-cover"
          />
        </video>

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-purple-900/50 to-pink-900/60" />
      </div>

      {/* Mute/Unmute Button */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute right-4 top-4 z-20 rounded-full bg-white/20 p-2 backdrop-blur-sm transition-colors hover:bg-white/30"
        aria-label={isMuted ? 'Unmute video' : 'Mute video'}
      >
        {isMuted ? (
          <VolumeX className="h-5 w-5 text-white" />
        ) : (
          <Volume2 className="h-5 w-5 text-white" />
        )}
      </button>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Logo or Store Name Animation */}
          <div className="mb-8">
            <div className="inline-block">
              <div className="animate-pulse bg-gradient-to-r from-yellow-400 to-pink-400 bg-clip-text text-transparent">
                <p className="mb-2 text-2xl font-medium md:text-3xl">PREMIUM SALON</p>
              </div>
            </div>
          </div>

          <h1 className="text-5xl font-bold leading-tight text-white md:text-7xl">
            <span className="mb-2 block">【{store.name.replace('店', '')}】</span>
            <span className="block bg-gradient-to-r from-pink-300 to-yellow-300 bg-clip-text text-transparent">
              回春・性感マッサージ
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-xl text-white/90 md:text-2xl">
            風俗・デリヘル・出張エステでの
            <br className="md:hidden" />
            極上の施術なら
          </p>

          <p className="text-4xl font-bold text-yellow-300 drop-shadow-lg md:text-5xl">
            {store.displayName}
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              className="transform bg-gradient-to-r from-yellow-500 to-yellow-600 px-8 py-6 text-lg font-bold text-black shadow-xl transition-all duration-200 hover:scale-105 hover:from-yellow-600 hover:to-yellow-700"
            >
              <Phone className="mr-2 h-5 w-5" />
              今スグ予約
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-white px-8 py-6 text-lg font-bold text-white hover:bg-white hover:text-black"
              asChild
            >
              <Link href={`/${store.slug}/cast`}>キャスト一覧を見る</Link>
            </Button>
          </div>

          {/* Features */}
          <div className="mx-auto mt-12 grid max-w-3xl grid-cols-3 gap-4 md:gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-300 md:text-4xl">150+</div>
              <div className="text-sm text-white/80 md:text-base">在籍キャスト</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-300 md:text-4xl">4.8</div>
              <div className="text-sm text-white/80 md:text-base">平均評価</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-300 md:text-4xl">24H</div>
              <div className="text-sm text-white/80 md:text-base">営業時間</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 transform animate-bounce">
        <div className="flex h-10 w-6 justify-center rounded-full border-2 border-white">
          <div className="mt-2 h-3 w-1 animate-pulse rounded-full bg-white" />
        </div>
      </div>
    </section>
  )
}

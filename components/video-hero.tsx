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

export function VideoHero({ store, videoUrl = '/videos/hero-background.mp4', posterUrl }: VideoHeroProps) {
  const [isMuted, setIsMuted] = useState(true)
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)

  return (
    <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
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
          className="absolute w-full h-full object-cover"
        >
          <source src={videoUrl} type="video/mp4" />
          {/* You can add multiple sources for different formats */}
          <source src={videoUrl.replace('.mp4', '.webm')} type="video/webm" />
          
          {/* Fallback image for browsers that don't support video */}
          <img 
            src={posterUrl || '/images/hero-fallback.jpg'} 
            alt="Hero background"
            className="absolute w-full h-full object-cover"
          />
        </video>
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-purple-900/50 to-pink-900/60" />
      </div>

      {/* Mute/Unmute Button */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute top-4 right-4 z-20 p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
        aria-label={isMuted ? 'Unmute video' : 'Mute video'}
      >
        {isMuted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
      </button>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="space-y-6">
          {/* Logo or Store Name Animation */}
          <div className="mb-8">
            <div className="inline-block">
              <div className="animate-pulse bg-gradient-to-r from-yellow-400 to-pink-400 text-transparent bg-clip-text">
                <p className="text-2xl md:text-3xl font-medium mb-2">PREMIUM SALON</p>
              </div>
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight">
            <span className="block mb-2">【{store.name.replace('店', '')}】</span>
            <span className="block bg-gradient-to-r from-pink-300 to-yellow-300 text-transparent bg-clip-text">
              回春・性感マッサージ
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto">
            風俗・デリヘル・出張エステでの<br className="md:hidden" />
            極上の施術なら
          </p>
          
          <p className="text-4xl md:text-5xl font-bold text-yellow-300 drop-shadow-lg">
            {store.displayName}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-10">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold text-lg px-8 py-6 shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <Phone className="mr-2 h-5 w-5" />
              今スグ予約
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-2 border-white text-white hover:bg-white hover:text-black font-bold text-lg px-8 py-6"
              asChild
            >
              <Link href={`/${store.slug}/cast`}>
                キャスト一覧を見る
              </Link>
            </Button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 md:gap-8 max-w-3xl mx-auto mt-12">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-yellow-300">150+</div>
              <div className="text-sm md:text-base text-white/80">在籍キャスト</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-yellow-300">4.8</div>
              <div className="text-sm md:text-base text-white/80">平均評価</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-yellow-300">24H</div>
              <div className="text-sm md:text-base text-white/80">営業時間</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white rounded-full mt-2 animate-pulse" />
        </div>
      </div>
    </section>
  )
}
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AgeVerification } from '@/components/age-verification'

const navigation = [
  { label: 'GOLD ESTHE GROUP 総合TOP', href: '/' },
  { label: '金の玉クラブ 池袋店', href: '/ikebukuro' },
  { label: '【女性求人】金の玉クラブ 池袋店', href: '/ikebukuro/recruitment' },
]

export default function HomePage() {
  const [isVerified, setIsVerified] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const verified = localStorage.getItem('ageVerified')
    if (verified === 'true') {
      setIsVerified(true)
    }
    setIsLoading(false)
  }, [])

  const handleVerification = (isAdult: boolean) => {
    if (isAdult) {
      localStorage.setItem('ageVerified', 'true')
      setIsVerified(true)
    } else {
      window.location.href = 'https://www.google.com'
    }
  }

  if (isLoading) {
    return null
  }

  if (!isVerified) {
    return <AgeVerification onVerify={handleVerification} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0b08] via-[#0c0a08] to-[#080604] text-[#f6ead3]">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-10 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 shadow-inner shadow-amber-500/10 ring-1 ring-amber-200/60">
              <span className="font-display text-lg uppercase tracking-[0.28em] text-amber-200">
                G
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.4em] text-amber-200">Gold Esthe Group</p>
              <p className="text-sm text-white/60">GOLD ESTHE GROUP ロゴ</p>
            </div>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-amber-100">
            Adult Only
          </span>
        </header>

        <main className="flex flex-1 flex-col gap-10 py-10">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-amber-500/5 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.3em] text-amber-200">Notice</p>
            <p className="mt-3 text-lg leading-relaxed text-white/80">
              当サイトは、１８歳未満および高校生の
              <br className="hidden sm:block" />
              ご利用をお断り致します。
            </p>
          </section>

          <section className="space-y-6">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-amber-200">Kintama Club</p>
              <h1 className="font-display text-4xl tracking-tight text-amber-100 sm:text-5xl">
                金の玉クラブ
              </h1>
              <p className="text-lg text-white/70">池袋本店</p>
            </div>

            <div className="space-y-4 text-base leading-relaxed text-white/80">
              <p>
                金の玉クラブは厳選した美女による、エッチで密着度の高い性感睾丸マッサージの専門店です。
              </p>
              <p>
                エッチなマッサージが大好きな美女が足のつま先から頭のてっぺんまで、気持ちが良すぎておかしくなるほどの密着プレイであなたを楽しませます。あなたはただ寝ているだけで、極上の快楽を感じることができます。そして、ジラしにジラされてパンパンになった睾丸から精子が飛び出す瞬間は、言葉では言い表せないほどの快感で、まさに極上射精。
              </p>
              <p>いやらしい美女の密着マッサージで癒やしのひと時をお楽しみください。</p>
            </div>
          </section>

          <nav className="grid gap-3 sm:grid-cols-3">
            {navigation.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm tracking-wide text-amber-100 transition hover:border-amber-200/60 hover:bg-white/10"
              >
                <span className="leading-tight">{item.label}</span>
                <span className="text-base text-white/50 transition group-hover:text-amber-200">→</span>
              </Link>
            ))}
          </nav>
        </main>

        <footer className="mt-auto border-t border-white/10 pt-6 text-center text-xs text-white/50">
          Copyright (C)GOLD ESTHE GROUP All Contents Reserved
        </footer>
      </div>
    </div>
  )
}

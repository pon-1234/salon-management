'use client'

import { useState, useEffect } from 'react'
import { AgeVerification } from '@/components/age-verification'
import { Store } from '@/lib/store/types'
import { StoreHomeContent } from '@/components/store-home-content'

interface StoreHomeClientProps {
  store: Store
}

export function StoreHomeClient({ store }: StoreHomeClientProps) {
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

  return <StoreHomeContent store={store} />
}

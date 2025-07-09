/**
 * @design_doc   MyPage content component with session integration
 * @related_to   NextAuth.js configuration, customer authentication
 * @known_issues None currently
 */
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Store } from '@/lib/store/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileSection } from './profile-section'
import { ReservationHistory } from './reservation-history'
import { FavoriteCasts } from './favorite-casts'
import { PointHistory } from './point-history'
import { User, Calendar, Heart, Coins } from 'lucide-react'

interface MyPageContentProps {
  store: Store
}

export function MyPageContent({ store }: MyPageContentProps) {
  const [activeTab, setActiveTab] = useState('profile')
  const { data: session, status } = useSession()

  // Show loading state while session is loading
  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      </div>
    )
  }

  // This should not happen due to server-side auth check, but just in case
  if (!session?.user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-lg bg-white p-6 shadow">
          <p>認証が必要です。ログインしてください。</p>
        </div>
      </div>
    )
  }

  // Use session data, with fallbacks for missing data
  const user = {
    nickname: session.user.name || 'ゲスト',
    email: session.user.email || '',
    phone: '090-1234-5678', // This would come from user profile API
    birthMonth: 5, // This would come from user profile API
    memberType: 'regular' as const, // This would come from user profile API
    points: 2500, // This would come from user profile API
    registeredAt: new Date('2024-01-15'), // This would come from user profile API
    smsEnabled: true, // This would come from user profile API
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-2xl font-bold">{user.nickname}さんのマイページ</h1>
            <p className="text-gray-600">
              会員ランク: {user.memberType === 'regular' ? '通常会員' : 'VIP会員'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">保有ポイント</p>
            <p className="text-3xl font-bold text-purple-600">
              {user.points.toLocaleString()}
              <span className="ml-1 text-sm">pt</span>
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">プロフィール</span>
          </TabsTrigger>
          <TabsTrigger value="reservations" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">予約履歴</span>
          </TabsTrigger>
          <TabsTrigger value="favorites" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">お気に入り</span>
          </TabsTrigger>
          <TabsTrigger value="points" className="flex items-center gap-2">
            <Coins className="h-4 w-4" />
            <span className="hidden sm:inline">ポイント</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileSection user={user} store={store} />
        </TabsContent>

        <TabsContent value="reservations">
          <ReservationHistory store={store} />
        </TabsContent>

        <TabsContent value="favorites">
          <FavoriteCasts store={store} />
        </TabsContent>

        <TabsContent value="points">
          <PointHistory user={user} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

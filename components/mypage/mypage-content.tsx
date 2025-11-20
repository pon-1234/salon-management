/**
 * @design_doc   MyPage content component with session integration
 * @related_to   NextAuth.js configuration, customer authentication
 * @known_issues None currently
 */
'use client'

import { useEffect, useState, useTransition } from 'react'
import { useSession } from 'next-auth/react'
import { Store } from '@/lib/store/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileSection } from './profile-section'
import { ReservationHistory } from './reservation-history'
import { FavoriteCasts } from './favorite-casts'
import { PointHistory } from './point-history'
import { CustomerChatPanel } from './customer-chat-panel'
import { User, Calendar, Heart, Coins, LogOut, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'

interface MyPageContentProps {
  store: Store
}

interface CustomerProfile {
  id: string
  name: string
  email: string
  phone: string
  birthDate: Date | null
  memberType: 'regular' | 'vip'
  points: number
  createdAt: Date | null
  smsEnabled: boolean
  emailNotificationEnabled: boolean
}

export function MyPageContent({ store }: MyPageContentProps) {
  const [activeTab, setActiveTab] = useState('profile')
  const [isPending, startTransition] = useTransition()
  const { data: session, status } = useSession()
  const { logout } = useAuth()
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)

  useEffect(() => {
    if (!session?.user?.id) {
      setProfile(null)
      return
    }

    let active = true
    const fetchProfile = async () => {
      setProfileLoading(true)
      setProfileError(null)
      try {
        const response = await fetch(`/api/customer?id=${session.user.id}`, {
          credentials: 'include',
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error('顧客情報の取得に失敗しました')
        }

        const data = await response.json()
        if (!active) return

        setProfile({
          id: data.id,
          name: data.name ?? session.user.name ?? 'ゲスト',
          email: data.email ?? session.user.email ?? '',
          phone: data.phone ?? '',
          birthDate: data.birthDate ? new Date(data.birthDate) : null,
          memberType: data.memberType ?? 'regular',
          points: data.points ?? 0,
          createdAt: data.createdAt ? new Date(data.createdAt) : null,
          smsEnabled: Boolean(data.smsEnabled),
          emailNotificationEnabled:
            data.emailNotificationEnabled === undefined ? true : Boolean(data.emailNotificationEnabled),
        })
      } catch (error) {
        if (!active) return
        setProfileError(
          error instanceof Error ? error.message : '顧客情報の取得に失敗しました'
        )
      } finally {
        if (active) {
          setProfileLoading(false)
        }
      }
    }

    fetchProfile()
    return () => {
      active = false
    }
  }, [session?.user?.id, session?.user?.email, session?.user?.name])

  // Show loading state while session is loading
  if (status === 'loading' || profileLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="animate-pulse">
            <div className="mb-4 h-8 w-1/3 rounded bg-gray-200"></div>
            <div className="h-4 w-1/4 rounded bg-gray-200"></div>
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

  if (profileError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-red-600">{profileError}</p>
        </div>
      </div>
    )
  }

  const user = profile && {
    nickname: profile.name || session.user.name || 'ゲスト',
    email: profile.email || session.user.email || '',
    phone: profile.phone || '',
    birthMonth: profile.birthDate ? profile.birthDate.getMonth() + 1 : 1,
    memberType: profile.memberType,
    points: profile.points,
    registeredAt: profile.createdAt ?? new Date(),
    smsEnabled: profile.smsEnabled,
    emailNotificationEnabled: profile.emailNotificationEnabled,
  }

  const handleProfileUpdated = (updated: any) => {
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            name: updated.name ?? prev.name,
            email: updated.email ?? prev.email,
            phone: updated.phone ?? prev.phone,
            smsEnabled:
              typeof updated.smsEnabled === 'boolean' ? updated.smsEnabled : prev.smsEnabled,
            emailNotificationEnabled:
              typeof updated.emailNotificationEnabled === 'boolean'
                ? updated.emailNotificationEnabled
                : prev.emailNotificationEnabled,
          }
        : prev
    )
  }

  if (!user) {
    return null
  }

  const handleLogout = () => {
    startTransition(() => {
      logout(`/${store.slug}/login`).catch((error) => {
        console.error('Failed to logout from MyPage:', error)
      })
    })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex-1">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="mb-1 text-2xl font-bold">{user.nickname}さんのマイページ</h1>
                <p className="text-gray-600">
                  会員ランク: {user.memberType === 'regular' ? '通常会員' : 'VIP会員'}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm text-gray-500">保有ポイント</p>
                <p className="text-3xl font-bold text-purple-600">
                  {user.points.toLocaleString()}
                  <span className="ml-1 text-sm">pt</span>
                </p>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full gap-2 md:w-auto"
            onClick={handleLogout}
            disabled={isPending}
          >
            <LogOut className="h-4 w-4" />
            {isPending ? 'ログアウト中...' : 'ログアウト'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 grid w-full grid-cols-5">
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
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">店舗チャット</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileSection
            customerId={profile.id}
            user={user}
            onProfileUpdated={handleProfileUpdated}
          />
        </TabsContent>

        <TabsContent value="reservations">
          <ReservationHistory store={store} />
        </TabsContent>

        <TabsContent value="favorites">
          <FavoriteCasts store={store} />
        </TabsContent>

        <TabsContent value="points">
          <PointHistory customerId={session.user.id} initialBalance={user.points} />
        </TabsContent>
        <TabsContent value="chat">
          <CustomerChatPanel storeName={store.displayName} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

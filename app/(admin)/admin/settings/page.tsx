'use client'

/**
 * @design_doc   ui-improvement-instructions.md U-6 admin page header
 * @related_to   PageHeader: shared admin title area; Header: global admin navigation
 * @known_issues None
 */
import { useState } from 'react'
import NextLink from 'next/link'
import { PageHeader } from '@/components/admin/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Store,
  Calendar,
  MapPin,
  Train,
  Shield,
  CreditCard,
  Building,
  Settings as SettingsIcon,
  ChevronRight,
  Package,
  BookOpen,
  Receipt,
  Coins,
} from 'lucide-react'

interface SettingItem {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  status: 'available'
  category: string
  href: string
}

export default function SettingsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const settingsItems: SettingItem[] = [
    {
      id: 'store-info',
      title: '店舗情報',
      description: '店舗の基本情報、営業時間、連絡先などを管理',
      icon: <Store className="h-5 w-5" />,
      status: 'available',
      category: '基本設定',
      href: '/admin/settings/store-info',
    },
    {
      id: 'reviews',
      title: '口コミ管理',
      description: '公開中・審査中の口コミを確認し、公開ステータスを変更',
      icon: <Shield className="h-5 w-5" />,
      status: 'available',
      category: '顧客対応',
      href: '/admin/reviews',
    },
    {
      id: 'event-banners',
      title: 'トップページバナー',
      description: 'PCサイト向けバナー画像とリンクを管理',
      icon: <Calendar className="h-5 w-5" />,
      status: 'available',
      category: 'コンテンツ管理',
      href: '/admin/settings/event-banners',
    },
    {
      id: 'area-info',
      title: 'エリア情報',
      description: 'サービス提供エリアの情報を管理',
      icon: <MapPin className="h-5 w-5" />,
      status: 'available',
      category: '地域設定',
      href: '/admin/settings/area-info',
    },
    {
      id: 'station-info',
      title: '駅情報',
      description: '最寄り駅や交通費設定を管理',
      icon: <Train className="h-5 w-5" />,
      status: 'available',
      category: '地域設定',
      href: '/admin/settings/station-info',
    },
    {
      id: 'admin-info',
      title: '管理者情報',
      description: '管理者アカウントと権限を管理',
      icon: <Shield className="h-5 w-5" />,
      status: 'available',
      category: 'セキュリティ',
      href: '/admin/settings/admin-info',
    },
    {
      id: 'hp-pricing',
      title: 'HP料金情報',
      description: 'ホームページに表示する料金情報を管理',
      icon: <CreditCard className="h-5 w-5" />,
      status: 'available',
      category: 'コンテンツ管理',
      href: '/admin/settings/hp-pricing',
    },
    {
      id: 'hotel-info',
      title: 'ホテル情報',
      description: 'ホテル情報とマッピング設定',
      icon: <Building className="h-5 w-5" />,
      status: 'available',
      category: '地域設定',
      href: '/admin/settings/hotel-info',
    },
    {
      id: 'points',
      title: 'ポイント設定',
      description: 'ポイント付与率や有効期限を管理',
      icon: <Coins className="h-5 w-5" />,
      status: 'available',
      category: '顧客対応',
      href: '/admin/settings/points',
    },
    {
      id: 'option-info',
      title: 'オプション情報',
      description: 'サービスオプションの管理と料金設定',
      icon: <Package className="h-5 w-5" />,
      status: 'available',
      category: 'サービス管理',
      href: '/admin/settings/option-info',
    },
    {
      id: 'course-info',
      title: 'コース情報',
      description: 'コース内容と料金の管理',
      icon: <BookOpen className="h-5 w-5" />,
      status: 'available',
      category: 'サービス管理',
      href: '/admin/settings/course-info',
    },
    {
      id: 'designation-fees',
      title: '指名料設定',
      description: 'フリー指名・本指名などの指名料と売上配分を管理',
      icon: <Receipt className="h-5 w-5" />,
      status: 'available',
      category: 'サービス管理',
      href: '/admin/settings/designation-fees',
    },
  ]

  const categories = [...new Set(settingsItems.map((item) => item.category))]

  const filteredItems = selectedCategory
    ? settingsItems.filter((item) => item.category === selectedCategory)
    : settingsItems

  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader title="設定" icon={SettingsIcon} />

        {/* カテゴリフィルター */}
        <div className="mb-8 flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            onClick={() => setSelectedCategory(null)}
            className="mb-2"
          >
            すべて
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(category)}
              className="mb-2"
            >
              {category}
            </Button>
          ))}
        </div>

        {/* 設定項目グリッド */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => {
            const card = (
              <Card className="h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="rounded-lg bg-emerald-100 p-3">
                      <div className="text-emerald-600">{item.icon}</div>
                    </div>
                    <div>
                      <Badge variant="outline" className="text-xs">
                        {item.category}
                      </Badge>
                    </div>
                  </div>
                  <CardTitle className="text-lg font-semibold">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4 text-sm text-gray-600">
                    {item.description}
                  </CardDescription>
                  <div className="flex items-center justify-between">
                    <div className="flex-1" />
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            )

            return (
              <NextLink key={item.id} href={item.href} className="block">
                {card}
              </NextLink>
            )
          })}
        </div>

        {/* 統計情報 */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">設定項目</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">{settingsItems.length}</div>
              <p className="text-sm text-gray-600">総設定項目数</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">利用可能</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {settingsItems.filter((item) => item.status === 'available').length}
              </div>
              <p className="text-sm text-gray-600">設定可能な項目</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

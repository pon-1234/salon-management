'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Store,
  HelpCircle,
  MessageSquare,
  Calendar,
  MapPin,
  Train,
  Megaphone,
  Shield,
  CreditCard,
  Link,
  Building,
  FileText,
  Mail,
  Settings as SettingsIcon,
  ChevronRight,
  Package,
  BookOpen,
  Receipt,
} from 'lucide-react'

interface SettingItem {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  status: 'available' | 'coming-soon'
  category: string
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
    },
    {
      id: 'business-qa',
      title: '業務Q&A管理',
      description: 'スタッフ向けの業務Q&Aを管理',
      icon: <HelpCircle className="h-5 w-5" />,
      status: 'coming-soon',
      category: '業務管理',
    },
    {
      id: 'faq',
      title: 'よくある質問',
      description: '顧客向けのよくある質問を管理',
      icon: <MessageSquare className="h-5 w-5" />,
      status: 'available',
      category: '顧客対応',
    },
    {
      id: 'events',
      title: 'イベント(PC)',
      description: 'PCサイト向けのイベント情報を管理',
      icon: <Calendar className="h-5 w-5" />,
      status: 'available',
      category: 'コンテンツ管理',
    },
    {
      id: 'area-info',
      title: 'エリア情報',
      description: 'サービス提供エリアの情報を管理',
      icon: <MapPin className="h-5 w-5" />,
      status: 'available',
      category: '地域設定',
    },
    {
      id: 'station-info',
      title: '駅情報',
      description: '最寄り駅や交通費設定を管理',
      icon: <Train className="h-5 w-5" />,
      status: 'available',
      category: '地域設定',
    },
    {
      id: 'media-info',
      title: '媒体情報',
      description: '広告媒体や集客チャネルの情報を管理',
      icon: <Megaphone className="h-5 w-5" />,
      status: 'available',
      category: 'マーケティング',
    },
    {
      id: 'admin-info',
      title: '管理者情報',
      description: '管理者アカウントと権限を管理',
      icon: <Shield className="h-5 w-5" />,
      status: 'available',
      category: 'セキュリティ',
    },
    {
      id: 'hp-pricing',
      title: 'HP料金情報',
      description: 'ホームページに表示する料金情報を管理',
      icon: <CreditCard className="h-5 w-5" />,
      status: 'available',
      category: 'コンテンツ管理',
    },
    {
      id: 'mutual-links',
      title: '相互リンク',
      description: '相互リンクの管理',
      icon: <Link className="h-5 w-5" />,
      status: 'available',
      category: 'コンテンツ管理',
    },
    {
      id: 'hotel-info',
      title: 'ホテル情報',
      description: 'ホテル情報とマッピング設定',
      icon: <Building className="h-5 w-5" />,
      status: 'available',
      category: '地域設定',
    },
    {
      id: 'templates',
      title: '定型文',
      description: 'メッセージやメールの定型文を管理',
      icon: <FileText className="h-5 w-5" />,
      status: 'available',
      category: '顧客対応',
    },
    {
      id: 'newsletter',
      title: 'メルマガ送信',
      description: 'メルマガの作成と送信管理',
      icon: <Mail className="h-5 w-5" />,
      status: 'available',
      category: 'マーケティング',
    },
    {
      id: 'option-info',
      title: 'オプション情報',
      description: 'サービスオプションの管理と料金設定',
      icon: <Package className="h-5 w-5" />,
      status: 'available',
      category: 'サービス管理',
    },
    {
      id: 'course-info',
      title: 'コース情報',
      description: 'コース内容と料金の管理',
      icon: <BookOpen className="h-5 w-5" />,
      status: 'available',
      category: 'サービス管理',
    },
    {
      id: 'additional-fees',
      title: '追加料金設定',
      description: '指名料、交通費、深夜料金などの追加料金を管理',
      icon: <Receipt className="h-5 w-5" />,
      status: 'available',
      category: 'サービス管理',
    },
  ]

  const categories = [...new Set(settingsItems.map((item) => item.category))]

  const filteredItems = selectedCategory
    ? settingsItems.filter((item) => item.category === selectedCategory)
    : settingsItems

  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-gray-700" />
          <h1 className="text-3xl font-bold text-gray-900">設定</h1>
        </div>

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
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                item.status === 'coming-soon'
                  ? 'cursor-not-allowed opacity-60'
                  : 'hover:-translate-y-1 hover:shadow-lg'
              }`}
              onClick={() => {
                if (item.status === 'available') {
                  // 利用可能な設定項目のナビゲーション
                  switch (item.id) {
                    case 'store-info':
                      window.location.href = '/admin/settings/store-info'
                      break
                    case 'option-info':
                      window.location.href = '/admin/settings/option-info'
                      break
                    case 'course-info':
                      window.location.href = '/admin/settings/course-info'
                      break
                    case 'area-info':
                      window.location.href = '/admin/settings/area-info'
                      break
                    case 'station-info':
                      window.location.href = '/admin/settings/station-info'
                      break
                    case 'hp-pricing':
                      window.location.href = '/admin/settings/hp-pricing'
                      break
                    case 'mutual-links':
                      window.location.href = '/admin/settings/mutual-links'
                      break
                    case 'hotel-info':
                      window.location.href = '/admin/settings/hotel-info'
                      break
                    case 'templates':
                      window.location.href = '/admin/settings/templates'
                      break
                    case 'additional-fees':
                      window.location.href = '/admin/settings/additional-fees'
                      break
                    default:
                      console.log(`${item.title}の設定ページは準備中です`)
                      alert(`${item.title}の設定ページは準備中です`)
                  }
                }
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div
                    className={`rounded-lg p-3 ${
                      item.status === 'available' ? 'bg-emerald-100' : 'bg-gray-100'
                    }`}
                  >
                    <div
                      className={`${
                        item.status === 'available' ? 'text-emerald-600' : 'text-gray-400'
                      }`}
                    >
                      {item.icon}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    {item.status === 'coming-soon' && (
                      <Badge variant="secondary" className="text-xs">
                        準備中
                      </Badge>
                    )}
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
                  {item.status === 'available' && (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 統計情報 */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
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

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">準備中</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {settingsItems.filter((item) => item.status === 'coming-soon').length}
              </div>
              <p className="text-sm text-gray-600">準備中の項目</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

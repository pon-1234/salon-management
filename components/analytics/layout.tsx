import { Calendar, BarChart3, CalendarDays, Clock, Users } from 'lucide-react';
import Link from 'next/link';

const navigation = [
  {
    name: "日次レポート",
    href: "/admin/analytics/daily-sales",
    icon: Calendar,
  },
  {
    name: "月次レポート",
    href: "/admin/analytics/monthly-sales",
    icon: BarChart3,
  },
  {
    name: "年間レポート",
    href: "/admin/analytics/annual-sales",
    icon: CalendarDays,
  },
  {
    name: "コース別集計",
    href: "/admin/analytics/course-sales",
    icon: BarChart3,
  },
  {
    name: "オプション別集計",
    href: "/admin/analytics/option-sales",
    icon: BarChart3,
  },
  {
    name: "営業媒体別集計",
    href: "/admin/analytics/marketing-channels",
    icon: BarChart3,
  },
  {
    name: "エリア別集計",
    href: "/admin/analytics/area-sales",
    icon: BarChart3,
  },
  {
    name: "区別集計",
    href: "/admin/analytics/district-sales",
    icon: BarChart3,
  },
  {
    name: "時間別集計",
    href: "/admin/analytics/hourly-sales",
    icon: Clock,
  },
  {
    name: "キャスト実績",
    href: "/admin/analytics/cast-performance",
    icon: Users,
  },
  {
    name: "就業データ",
    href: "/admin/analytics/staff-attendance",
    icon: Users,
  },
];

export function AnalyticsLayout() {
  return (
    <nav className="w-64 bg-gray-100 flex-shrink-0 border-r sticky top-[83px] h-[calc(100vh-83px)] overflow-y-auto">
      <ul className="space-y-2 p-4">
        {navigation.map((item) => (
          <li key={item.name}>
            <Link href={item.href} className="flex items-center p-2 rounded hover:bg-gray-200">
              <item.icon className="w-5 h-5 mr-2" />
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

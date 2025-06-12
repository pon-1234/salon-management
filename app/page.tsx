import { redirect } from 'next/navigation'

export default function RootPage() {
  // デフォルトでエンドユーザー向けページにリダイレクト
  redirect('/')
}
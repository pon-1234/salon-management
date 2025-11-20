'use client'

import { SimpleChatPanel } from '@/components/chat/simple-chat-panel'

export function CastChatPanel() {
  return (
    <SimpleChatPanel
      endpoint="/api/cast-portal/chat"
      senderRole="cast"
      title="店舗スタッフとのチャット"
      description="運営スタッフとの連絡にご利用ください。要対応の内容はできるだけ本文の先頭に記載してください。"
      placeholder="スタッフへのメッセージを入力してください"
      emptyState={{
        title: 'まだメッセージはありません。',
        description: '問い合わせや報告があれば、下のフォームから送信してください。',
      }}
    />
  )
}

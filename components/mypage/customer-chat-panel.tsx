'use client'

import { SimpleChatPanel } from '@/components/chat/simple-chat-panel'

interface CustomerChatPanelProps {
  storeName?: string
}

export function CustomerChatPanel({ storeName }: CustomerChatPanelProps) {
  return (
    <SimpleChatPanel
      endpoint="/api/customer/chat"
      senderRole="customer"
      title={`${storeName ?? '店舗'}とのチャット`}
      description="予約内容の確認や要望など、お気軽にご相談ください。返信にはお時間を頂く場合があります。"
      placeholder="店舗スタッフへのメッセージを入力してください"
      emptyState={{
        title: 'メッセージはまだありません。',
        description: '確認したいことがあれば下のフォームから送信してください。',
      }}
    />
  )
}

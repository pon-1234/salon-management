# リアルタイムチャットステータス実装計画

## 概要
現在のチャットシステムにリアルタイムステータス機能を追加し、以下の機能を実現します：
- オンライン/オフラインステータス表示
- タイピングインジケーター
- リアルタイムメッセージ配信
- 既読/未読ステータスの即時更新

## 技術スタック選択

### 推奨: Server-Sent Events (SSE)
- Next.js App Routerと互換性が高い
- 一方向通信に適している（サーバー → クライアント）
- WebSocketより実装が簡単
- HTTPプロトコルを使用するため、プロキシやファイアウォールとの互換性が高い

### 代替案: WebSocket (Socket.io)
- 双方向通信が可能
- より高度なリアルタイム機能に対応
- 実装が複雑

## 実装手順

### 1. SSEエンドポイントの作成
```typescript
// app/api/chat/sse/route.ts
export async function GET(request: NextRequest) {
  const stream = new ReadableStream({
    async start(controller) {
      // SSE接続の確立
      // ユーザーステータスの監視
      // メッセージの監視
    }
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

### 2. クライアント側のSSE接続
```typescript
// hooks/use-chat-sse.ts
export function useChatSSE(customerId: string) {
  useEffect(() => {
    const eventSource = new EventSource(`/api/chat/sse?customerId=${customerId}`)
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      // メッセージやステータスの更新処理
    }
    
    return () => eventSource.close()
  }, [customerId])
}
```

### 3. データベーススキーマの更新
```prisma
model UserStatus {
  id         String   @id @default(cuid())
  userId     String   @unique
  isOnline   Boolean  @default(false)
  lastSeen   DateTime @default(now())
  isTyping   Boolean  @default(false)
  typingTo   String?  // 誰に対してタイピング中か
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

### 4. リアルタイムイベントの種類
- `user-online`: ユーザーがオンラインになった
- `user-offline`: ユーザーがオフラインになった
- `typing-start`: タイピング開始
- `typing-stop`: タイピング終了
- `new-message`: 新しいメッセージ
- `message-read`: メッセージが既読になった

## UI/UXの改善

### 1. オンラインインジケーター
- ユーザーアバターに緑色のドットを表示
- 最終既読時刻の表示

### 2. タイピングインジケーター
- 「...」アニメーション
- 「〇〇さんが入力中...」のテキスト表示

### 3. リアルタイム通知
- 新着メッセージの即時表示
- 既読マークの即時更新

## セキュリティ考慮事項
- 認証されたユーザーのみSSE接続を許可
- ユーザーは自分に関連するイベントのみ受信
- レート制限の実装

## パフォーマンス最適化
- 接続プーリング
- アイドルタイムアウトの設定
- 再接続ロジックの実装

## 実装優先順位
1. 基本的なSSEエンドポイントの作成
2. オンライン/オフラインステータス
3. 新着メッセージのリアルタイム配信
4. 既読ステータスのリアルタイム更新
5. タイピングインジケーター
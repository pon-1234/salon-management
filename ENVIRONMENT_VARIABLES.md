# 環境変数設定ガイド

## 必須環境変数

### Vercel Dashboard で設定が必要な環境変数

以下の環境変数をVercelのプロジェクト設定から追加してください：

1. **Settings** → **Environment Variables** に移動
2. 以下の変数を追加：

### 認証関連

```bash
# NextAuth.js設定
NEXTAUTH_URL=https://your-production-domain.vercel.app
NEXTAUTH_SECRET=<32文字以上のランダムな文字列>
```

**NEXTAUTH_SECRETの生成方法:**
```bash
openssl rand -base64 32
```

### データベース

```bash
# PostgreSQL接続文字列
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"
```

### 決済（Stripe）

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### オプション

```bash
# 初期管理者パスワード（デフォルト: admin123）
INITIAL_ADMIN_PASSWORD=<安全なパスワード>
```

## 開発環境

開発環境では `.env.local` ファイルを使用：

```bash
# .env.local
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=development-secret
DATABASE_URL="postgresql://user:password@localhost:5432/salon_db?schema=public"
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
```

## セキュリティ注意事項

- 本番環境の環境変数は **絶対に** GitHubにコミットしないでください
- `NEXTAUTH_SECRET` は必ず強力なランダム文字列を使用してください
- データベースのパスワードは定期的に変更してください
- Stripeのキーは本番用（live）と開発用（test）を必ず分けてください
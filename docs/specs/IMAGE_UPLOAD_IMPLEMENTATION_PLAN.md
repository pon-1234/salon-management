# 画像アップロード永続化 実装計画（簡易版）

## 実装方針

Vercel環境での簡単な実装を優先し、**Vercel Blob Storage**を使用することを推奨します。

## なぜVercel Blob Storage？

1. **Vercelとの完全な統合** - 環境変数の自動設定
2. **シンプルなAPI** - 数行のコードで実装可能
3. **無料枠** - 1GBまで無料
4. **自動CDN** - エッジ配信で高速

## 実装手順

### 1. Vercel Blob Storageの有効化

```bash
# Vercelダッシュボードで設定するか、CLIで実行
vercel env add BLOB_READ_WRITE_TOKEN
```

### 2. パッケージのインストール

```bash
pnpm add @vercel/blob
```

### 3. アップロードAPIの更新

```typescript
// app/api/upload/route.ts
import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 })
    }

    // バリデーション（既存のロジックを維持）
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'ファイルサイズが大きすぎます（最大5MB）' },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: '対応していないファイル形式です（JPEG, PNG, WebPのみ）' },
        { status: 400 }
      )
    }

    // Vercel Blobにアップロード
    const blob = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: true, // ファイル名の重複を避ける
    })

    return NextResponse.json({
      success: true,
      url: blob.url,
      filename: file.name,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'アップロードに失敗しました' }, { status: 500 })
  }
}
```

### 4. 既存画像の移行（オプション）

既存の`/public/uploads`内の画像を移行する場合：

```typescript
// scripts/migrate-images-to-blob.ts
import { put } from '@vercel/blob'
import { readFile } from 'fs/promises'
import { glob } from 'glob'

async function migrateImages() {
  const files = await glob('public/uploads/**/*.{jpg,jpeg,png,webp}')

  for (const filePath of files) {
    const buffer = await readFile(filePath)
    const filename = filePath.split('/').pop()!

    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: `image/${filename.split('.').pop()}`,
    })

    console.log(`Migrated: ${filename} -> ${blob.url}`)

    // データベースのURL更新処理をここに追加
  }
}

migrateImages()
```

### 5. 環境変数の設定

```env
# .env.local
BLOB_READ_WRITE_TOKEN=vercel_blob_xxxxx
```

## コスト見積もり

| プラン | ストレージ | 帯域幅   | 料金     |
| ------ | ---------- | -------- | -------- |
| 無料   | 1GB        | 1GB/月   | $0       |
| Pro    | 100GB      | 100GB/月 | $20/月〜 |

## メリット

1. **実装が簡単** - 既存コードの変更が最小限
2. **メンテナンス不要** - Vercelが管理
3. **自動スケーリング** - トラフィックに応じて自動対応
4. **グローバルCDN** - 世界中から高速アクセス

## 注意事項

1. **削除機能** - アップロードした画像の削除も実装する
2. **容量監視** - 無料枠の1GBを超えないよう注意
3. **バックアップ** - 定期的なバックアップを検討

## 移行後のクリーンアップ

```bash
# ローカル画像の削除（移行確認後）
rm -rf public/uploads
```

この実装により、最小限の変更で画像の永続化が実現できます。

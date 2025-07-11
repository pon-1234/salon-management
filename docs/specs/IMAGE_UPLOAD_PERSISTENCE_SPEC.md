# 画像アップロード機能の永続化仕様書

## 1. 概要

現在、画像は`/public/uploads`ディレクトリにローカル保存されており、デプロイ時やサーバー再起動時に消失する可能性があります。この仕様書は、画像をクラウドストレージに永続化するための実装計画を定義します。

## 2. 現状の分析

### 2.1 現在の実装

- **保存先**: `/public/uploads`（ローカルファイルシステム）
- **エンドポイント**: `/api/upload`
- **ファイル制限**:
  - 最大サイズ: 5MB
  - 対応形式: JPEG, JPG, PNG, WebP
- **ファイル名**: `{timestamp}-{randomString}.{extension}`
- **使用箇所**: キャストプロフィール画像（最大10枚）

### 2.2 データベース構造

```prisma
model Cast {
  image    String    // メイン画像URL
  images   String[]  // 追加画像URLの配列（最大10枚）
}
```

## 3. クラウドストレージサービスの選定

### 3.1 比較検討

| サービス        | AWS S3               | Google Cloud Storage | Cloudflare R2 |
| --------------- | -------------------- | -------------------- | ------------- |
| **料金**        | $0.023/GB/月         | $0.020/GB/月         | $0.015/GB/月  |
| **転送料金**    | $0.09/GB             | $0.12/GB             | 無料          |
| **API互換性**   | S3 API               | 独自API              | S3 API互換    |
| **CDN統合**     | CloudFront（別料金） | Cloud CDN（別料金）  | 無料CDN付属   |
| **Next.js対応** | 良好                 | 良好                 | 良好          |

### 3.2 推奨サービス: Cloudflare R2

- **理由**:
  1. 転送料金無料（エグレス料金なし）
  2. S3 API互換で移行が容易
  3. CDNが無料で含まれる
  4. 料金が最も安価

## 4. 実装仕様

### 4.1 環境変数

```env
# Cloudflare R2
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=salon-management-images
R2_PUBLIC_URL=https://your-bucket.r2.cloudflarestorage.com

# Alternative: AWS S3
# AWS_REGION=ap-northeast-1
# AWS_ACCESS_KEY_ID=your_access_key
# AWS_SECRET_ACCESS_KEY=your_secret_key
# S3_BUCKET_NAME=salon-management-images
# S3_PUBLIC_URL=https://your-bucket.s3.amazonaws.com
```

### 4.2 新しいデータベーススキーマ

```prisma
// 画像メタデータを管理するテーブル
model Image {
  id         String   @id @default(cuid())
  filename   String   // 元のファイル名
  storageKey String   // ストレージ内のキー
  url        String   // 公開URL
  size       Int      // ファイルサイズ（バイト）
  mimeType   String   // MIMEタイプ
  width      Int?     // 画像の幅（オプション）
  height     Int?     // 画像の高さ（オプション）
  uploadedBy String?  // アップロードユーザーID（将来用）
  createdAt  DateTime @default(now())

  // リレーション
  castMainImages    Cast[] @relation("MainImage")
  castAdditionalImages CastImage[]
}

// Castモデルの更新
model Cast {
  id             String      @id @default(cuid())
  // ... 既存フィールド ...
  mainImageId    String?
  mainImage      Image?      @relation("MainImage", fields: [mainImageId], references: [id])
  additionalImages CastImage[]
}

// 中間テーブル（Cast-Image多対多）
model CastImage {
  castId   String
  imageId  String
  order    Int      // 表示順序
  cast     Cast     @relation(fields: [castId], references: [id], onDelete: Cascade)
  image    Image    @relation(fields: [imageId], references: [id])

  @@id([castId, imageId])
  @@index([castId])
}
```

### 4.3 API実装

#### 4.3.1 ストレージサービスインターフェース

```typescript
// lib/storage/types.ts
export interface StorageService {
  upload(file: File, key: string): Promise<UploadResult>
  delete(key: string): Promise<void>
  getUrl(key: string): string
}

export interface UploadResult {
  key: string
  url: string
  size: number
}
```

#### 4.3.2 Cloudflare R2実装

```typescript
// lib/storage/r2.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

export class R2StorageService implements StorageService {
  private client: S3Client
  private bucketName: string
  private publicUrl: string

  constructor() {
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })
    this.bucketName = process.env.R2_BUCKET_NAME!
    this.publicUrl = process.env.R2_PUBLIC_URL!
  }

  async upload(file: File, key: string): Promise<UploadResult> {
    const buffer = Buffer.from(await file.arrayBuffer())

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      })
    )

    return {
      key,
      url: this.getUrl(key),
      size: file.size,
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })
    )
  }

  getUrl(key: string): string {
    return `${this.publicUrl}/${key}`
  }
}
```

#### 4.3.3 更新されたアップロードAPI

```typescript
// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { R2StorageService } from '@/lib/storage/r2'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const uploadSchema = z.object({
  file: z.instanceof(File),
  type: z.enum(['cast-main', 'cast-additional']).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string

    // バリデーション
    const validated = uploadSchema.parse({ file, type })

    // ファイルサイズとタイプチェック（既存のロジック）

    // ストレージキーの生成
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split('.').pop()
    const key = `${type || 'general'}/${timestamp}-${randomString}.${extension}`

    // クラウドストレージへアップロード
    const storage = new R2StorageService()
    const result = await storage.upload(file, key)

    // データベースに記録
    const image = await prisma.image.create({
      data: {
        filename: file.name,
        storageKey: result.key,
        url: result.url,
        size: result.size,
        mimeType: file.type,
      },
    })

    return NextResponse.json({
      success: true,
      id: image.id,
      url: image.url,
      filename: image.filename,
    })
  } catch (error) {
    // エラーハンドリング
  }
}
```

### 4.4 マイグレーション戦略

#### 4.4.1 段階的移行

1. **Phase 1**: 新規アップロードをクラウドストレージに保存
2. **Phase 2**: 既存画像の移行スクリプト実行
3. **Phase 3**: ローカルストレージのクリーンアップ

#### 4.4.2 移行スクリプト

```typescript
// scripts/migrate-images.ts
async function migrateExistingImages() {
  const casts = await prisma.cast.findMany()

  for (const cast of casts) {
    // メイン画像の移行
    if (cast.image && cast.image.startsWith('/uploads/')) {
      const newImage = await migrateImageToCloud(cast.image)
      await prisma.cast.update({
        where: { id: cast.id },
        data: { mainImageId: newImage.id },
      })
    }

    // 追加画像の移行
    for (let i = 0; i < cast.images.length; i++) {
      const imageUrl = cast.images[i]
      if (imageUrl.startsWith('/uploads/')) {
        const newImage = await migrateImageToCloud(imageUrl)
        await prisma.castImage.create({
          data: {
            castId: cast.id,
            imageId: newImage.id,
            order: i,
          },
        })
      }
    }
  }
}
```

## 5. セキュリティ考慮事項

### 5.1 アクセス制御

- バケットは非公開設定
- 署名付きURLまたはCDN経由でのみアクセス可能
- アップロード時の認証チェック

### 5.2 ファイル検証

- MIMEタイプの検証
- ファイルヘッダーの検証（マジックナンバー）
- ウイルススキャン（オプション）

## 6. パフォーマンス最適化

### 6.1 画像最適化

- アップロード時の自動リサイズ（サムネイル生成）
- WebP形式への自動変換
- CDNキャッシュの活用

### 6.2 非同期処理

- 大きなファイルは非同期でアップロード
- ジョブキューの導入検討

## 7. 実装スケジュール

1. **Week 1**: 環境構築とSDKセットアップ
2. **Week 2**: アップロードAPIの実装
3. **Week 3**: データベーススキーマ更新とマイグレーション
4. **Week 4**: 既存画像の移行とテスト

## 8. テスト計画

### 8.1 単体テスト

- ストレージサービスのモック
- アップロードAPIのテスト
- バリデーションロジックのテスト

### 8.2 統合テスト

- 実際のストレージサービスとの連携
- エンドツーエンドのアップロードフロー
- 移行スクリプトのテスト

## 9. 監視とアラート

- アップロード成功率の監視
- ストレージ使用量の追跡
- エラー率のアラート設定

## 10. 今後の拡張

- 動画アップロード対応
- PDFなど他のファイルタイプ対応
- 画像編集機能（切り抜き、回転など）

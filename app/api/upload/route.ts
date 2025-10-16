import { NextRequest, NextResponse } from 'next/server'
import { getStorageService } from '@/lib/storage'
import logger from '@/lib/logger'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File
    const folder = data.get('folder') as string | null

    if (!file) {
      return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 })
    }

    // ストレージサービスを取得
    const storage = getStorageService()

    try {
      // ファイルをアップロード（バリデーションはサービス内で実行）
      const result = await storage.upload(file, {
        folder: folder || 'uploads',
      })

      return NextResponse.json({
        success: true,
        url: result.publicUrl,
        filename: result.filename,
        path: result.url,
      })
    } catch (uploadError: any) {
      // ストレージサービスからのエラーをそのまま返す
      if (uploadError.message.includes('ファイルサイズ')) {
        return NextResponse.json(
          { error: 'ファイルサイズが大きすぎます（最大5MB）' },
          { status: 400 }
        )
      }
      if (uploadError.message.includes('ファイル形式')) {
        return NextResponse.json(
          { error: '対応していないファイル形式です（JPEG, PNG, WebPのみ）' },
          { status: 400 }
        )
      }
      logger.error({ err: uploadError }, 'Image upload failed')
      const message =
        uploadError instanceof Error ? uploadError.message : 'アップロードに失敗しました'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  } catch (error) {
    logger.error({ err: error }, 'Upload error')
    return NextResponse.json({ error: 'アップロードに失敗しました' }, { status: 500 })
  }
}

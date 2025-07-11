import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import logger from '@/lib/logger'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File

    if (!file) {
      return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 })
    }

    // ファイルサイズチェック
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'ファイルサイズが大きすぎます（最大5MB）' },
        { status: 400 }
      )
    }

    // ファイル形式チェック
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
    logger.error({ err: error }, 'Upload error')
    return NextResponse.json({ error: 'アップロードに失敗しました' }, { status: 500 })
  }
}

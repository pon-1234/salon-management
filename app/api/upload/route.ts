import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const UPLOAD_DIR = join(process.cwd(), 'public/uploads')
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
      return NextResponse.json({ error: 'ファイルサイズが大きすぎます（最大5MB）' }, { status: 400 })
    }

    // ファイル形式チェック
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: '対応していないファイル形式です（JPEG, PNG, WebPのみ）' }, { status: 400 })
    }

    // アップロードディレクトリを作成
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true })
    }

    // ファイル名を生成（タイムスタンプ + ランダム文字列）
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split('.').pop()
    const fileName = `${timestamp}-${randomString}.${extension}`

    // ファイルを保存
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filePath = join(UPLOAD_DIR, fileName)
    
    await writeFile(filePath, buffer)

    // アップロードされたファイルのURLを返す
    const fileUrl = `/uploads/${fileName}`
    
    return NextResponse.json({ 
      success: true, 
      url: fileUrl,
      filename: fileName 
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'アップロードに失敗しました' }, { status: 500 })
  }
}
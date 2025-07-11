#!/usr/bin/env tsx
/**
 * 既存の画像をSupabase Storageに移行するスクリプト
 * 
 * 使用方法:
 * 1. 環境変数を設定 (.env.localまたは環境変数)
 * 2. スクリプトを実行: pnpm tsx scripts/migrate-images-to-blob.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFile, readdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// アップロードディレクトリ
const UPLOAD_DIR = join(process.cwd(), 'public/uploads')

// 画像ファイルの拡張子
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

// Supabaseクライアントの初期化
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)
const BUCKET_NAME = 'images'

async function migrateImages() {
  console.log('🚀 Supabase Storageへの画像移行を開始します...')

  // ディレクトリが存在するか確認
  if (!existsSync(UPLOAD_DIR)) {
    console.log('❌ アップロードディレクトリが存在しません:', UPLOAD_DIR)
    return
  }

  try {
    // ディレクトリ内のファイル一覧を取得
    const files = await readdir(UPLOAD_DIR)
    const imageFiles = files.filter(file => 
      IMAGE_EXTENSIONS.some(ext => file.toLowerCase().endsWith(ext))
    )

    console.log(`📁 ${imageFiles.length}個の画像ファイルが見つかりました`)

    if (imageFiles.length === 0) {
      console.log('✅ 移行する画像がありません')
      return
    }

    // 各画像をSupabaseにアップロード
    const results = []
    for (const filename of imageFiles) {
      try {
        const filePath = join(UPLOAD_DIR, filename)
        const buffer = await readFile(filePath)
        
        console.log(`📤 アップロード中: ${filename}`)
        
        // ファイルパスの生成
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(2, 15)
        const extension = filename.split('.').pop()
        const newFilename = `${timestamp}-${randomString}.${extension}`
        const path = `uploads/${newFilename}`
        
        // Supabaseにアップロード
        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(path, buffer, {
            contentType: `image/${extension}`,
            upsert: false,
          })
        
        if (error) {
          throw error
        }
        
        // 公開URLを取得
        const { data: publicUrlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(path)

        results.push({
          oldPath: `/uploads/${filename}`,
          newUrl: publicUrlData.publicUrl,
          path: path,
          filename: filename,
        })

        console.log(`✅ 完了: ${filename} -> ${publicUrlData.publicUrl}`)
      } catch (error) {
        console.error(`❌ エラー: ${filename}`, error)
      }
    }

    // データベースのURL更新
    console.log('\n📝 データベースのURL更新を開始します...')
    
    for (const result of results) {
      // Castテーブルのimage, imagesフィールドを更新
      const casts = await prisma.cast.findMany({
        where: {
          OR: [
            { image: result.oldPath },
            { images: { has: result.oldPath } }
          ]
        }
      })

      for (const cast of casts) {
        const updateData: any = {}
        
        // メイン画像の更新
        if (cast.image === result.oldPath) {
          updateData.image = result.newUrl
        }
        
        // 追加画像の更新
        if (cast.images.includes(result.oldPath)) {
          updateData.images = cast.images.map((img: string) => 
            img === result.oldPath ? result.newUrl : img
          )
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.cast.update({
            where: { id: cast.id },
            data: updateData,
          })
          console.log(`✅ Cast ID ${cast.id} のURLを更新しました`)
        }
      }
    }

    // 結果サマリー
    console.log('\n📊 移行結果:')
    console.log(`✅ 成功: ${results.length}個の画像`)
    console.log('\n移行した画像:')
    results.forEach(r => {
      console.log(`  ${r.filename}: ${r.newUrl}`)
    })

    // マッピングファイルを保存（バックアップ用）
    const mappingFile = join(process.cwd(), 'image-migration-mapping.json')
    await import('fs/promises').then(fs => 
      fs.writeFile(mappingFile, JSON.stringify(results, null, 2))
    )
    console.log(`\n💾 マッピング情報を保存しました: ${mappingFile}`)

  } catch (error) {
    console.error('❌ 移行中にエラーが発生しました:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 環境変数チェック
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('❌ Supabase環境変数が設定されていません')
  console.log('💡 .env.localファイルに以下を追加してください:')
  console.log('NEXT_PUBLIC_SUPABASE_URL=your_supabase_url')
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key')
  process.exit(1)
}

// スクリプト実行
migrateImages().catch(console.error)
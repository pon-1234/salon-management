import { createClient } from '@supabase/supabase-js'
import type {
  StorageService,
  UploadResult,
  DeleteResult,
  UploadOptions,
  StorageConfig,
} from './types'

interface SupabaseCredentials {
  url: string | undefined
  key: string | undefined
}

function resolveSupabaseCredentials(): SupabaseCredentials {
  if (typeof window === 'undefined') {
    try {
      const { env } = require('@/lib/config/env') as {
        env: {
          supabase: {
            url: string
            anonKey: string
            serviceRoleKey: string
          }
        }
      }
      return {
        url: env.supabase.url,
        key: env.supabase.serviceRoleKey || env.supabase.anonKey,
      }
    } catch {
      // Fall through to process.env derived values
    }
  }

  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }
}

export class SupabaseStorageService implements StorageService {
  private supabase
  private config: StorageConfig

  constructor(config: StorageConfig) {
    this.config = config

    // Supabase接続情報を環境変数から取得
    const { url: supabaseUrl, key: supabaseKey } = resolveSupabaseCredentials()

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Supabase環境変数が設定されていません。NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY を確認してください。'
      )
    }

    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  async upload(file: File, options?: UploadOptions): Promise<UploadResult> {
    // ファイルサイズチェック
    if (file.size > this.config.maxFileSize) {
      throw new Error(
        `ファイルサイズが大きすぎます（最大${this.config.maxFileSize / 1024 / 1024}MB）`
      )
    }

    // ファイルタイプチェック
    if (!this.config.allowedTypes.includes(file.type)) {
      throw new Error('対応していないファイル形式です')
    }

    // ファイルパスの生成
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileAny = file as any
    const originalName = fileAny?.name || 'upload'
    const extension = originalName.includes('.') ? originalName.split('.').pop() : 'bin'
    const filename = options?.filename || `${timestamp}-${randomString}.${extension}`
    const folder = options?.folder || 'uploads'
    const path = `${folder}/${filename}`

    const contentType =
      options?.contentType || fileAny?.type || 'application/octet-stream'

    let uploadBody: Blob | ArrayBuffer
    if (typeof fileAny?.arrayBuffer === 'function') {
      uploadBody = await fileAny.arrayBuffer()
    } else if (fileAny instanceof ArrayBuffer) {
      uploadBody = fileAny
    } else if (fileAny?.buffer instanceof ArrayBuffer) {
      uploadBody = fileAny.buffer
    } else {
      uploadBody = fileAny
    }

    // Supabaseにアップロード
    const { data, error } = await this.supabase.storage
      .from(this.config.bucket)
      .upload(path, uploadBody, {
        contentType,
        upsert: options?.upsert || false,
      })

    if (error) {
      throw new Error(`アップロードに失敗しました: ${error.message}`)
    }

    // 公開URLを取得
    const publicUrl = this.getPublicUrl(data.path)

    return {
      url: data.path,
      filename: originalName,
      size:
        fileAny?.size ??
        (uploadBody instanceof ArrayBuffer ? uploadBody.byteLength : undefined),
      publicUrl,
    }
  }

  async delete(path: string): Promise<DeleteResult> {
    const { error } = await this.supabase.storage.from(this.config.bucket).remove([path])

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
    }
  }

  getPublicUrl(path: string): string {
    const { data } = this.supabase.storage.from(this.config.bucket).getPublicUrl(path)

    return data.publicUrl
  }

  async exists(path: string): Promise<boolean> {
    const { data, error } = await this.supabase.storage
      .from(this.config.bucket)
      .list(path.split('/').slice(0, -1).join('/'), {
        limit: 1,
        search: path.split('/').pop(),
      })

    if (error) {
      return false
    }

    return data.length > 0
  }
}

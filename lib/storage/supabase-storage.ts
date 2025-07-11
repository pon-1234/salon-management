import { createClient } from '@supabase/supabase-js'
import type {
  StorageService,
  UploadResult,
  DeleteResult,
  UploadOptions,
  StorageConfig,
} from './types'

export class SupabaseStorageService implements StorageService {
  private supabase
  private config: StorageConfig

  constructor(config: StorageConfig) {
    this.config = config

    // Supabase接続情報を環境変数から取得
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase環境変数が設定されていません')
    }

    this.supabase = createClient(supabaseUrl, supabaseAnonKey)
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
    const extension = file.name.split('.').pop()
    const filename = options?.filename || `${timestamp}-${randomString}.${extension}`
    const folder = options?.folder || 'uploads'
    const path = `${folder}/${filename}`

    // Supabaseにアップロード
    const { data, error } = await this.supabase.storage
      .from(this.config.bucket)
      .upload(path, file, {
        contentType: options?.contentType || file.type,
        upsert: options?.upsert || false,
      })

    if (error) {
      throw new Error(`アップロードに失敗しました: ${error.message}`)
    }

    // 公開URLを取得
    const publicUrl = this.getPublicUrl(data.path)

    return {
      url: data.path,
      filename: file.name,
      size: file.size,
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

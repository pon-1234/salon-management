import { StorageService, StorageConfig } from './types'
import { SupabaseStorageService } from './supabase-storage'

// デフォルト設定
const DEFAULT_CONFIG: StorageConfig = {
  bucket: 'images',
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
}

let storageInstance: StorageService | null = null

/**
 * ストレージサービスのシングルトンインスタンスを取得
 */
export function getStorageService(config?: Partial<StorageConfig>): StorageService {
  if (!storageInstance) {
    const finalConfig = { ...DEFAULT_CONFIG, ...config }
    storageInstance = new SupabaseStorageService(finalConfig)
  }
  return storageInstance
}

// 型とインターフェースのエクスポート
export type {
  StorageService,
  UploadResult,
  DeleteResult,
  UploadOptions,
  StorageConfig,
} from './types'

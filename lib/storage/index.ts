/**
 * @design_doc   docs/VPS_DEPLOYMENT.md
 * @related_to   LocalStorageService - Persists uploads on the VPS volume
 * @known_issues docs/VPS_DEPLOYMENT.md
 */
import { StorageService, StorageConfig } from './types'
import { LocalStorageService } from './local-storage'

// デフォルト設定
const DEFAULT_CONFIG: StorageConfig = {
  bucket: 'images',
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
}

let storageInstance: StorageService | null = null

/**
 * ストレージサービスのシングルトンインスタンスを取得
 */
export function getStorageService(config?: Partial<StorageConfig>): StorageService {
  if (!storageInstance) {
    const finalConfig = { ...DEFAULT_CONFIG, ...config }
    storageInstance = new LocalStorageService(finalConfig, {
      root: process.env.STORAGE_ROOT ?? '/var/lib/salon-storage',
      publicBaseUrl:
        process.env.STORAGE_PUBLIC_BASE_URL ??
        `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/salon-uploads`,
    })
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

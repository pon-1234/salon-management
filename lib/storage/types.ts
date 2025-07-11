/**
 * ストレージサービスのインターフェース定義
 * 異なるストレージプロバイダーを切り替え可能にする
 */

export interface UploadResult {
  url: string
  filename: string
  size: number
  publicUrl: string
}

export interface DeleteResult {
  success: boolean
  error?: string
}

export interface StorageService {
  /**
   * ファイルをアップロード
   */
  upload(file: File, options?: UploadOptions): Promise<UploadResult>

  /**
   * ファイルを削除
   */
  delete(path: string): Promise<DeleteResult>

  /**
   * ファイルの公開URLを取得
   */
  getPublicUrl(path: string): string

  /**
   * ファイルが存在するか確認
   */
  exists(path: string): Promise<boolean>
}

export interface UploadOptions {
  /**
   * アップロード先のフォルダ
   */
  folder?: string

  /**
   * ファイル名（指定しない場合は自動生成）
   */
  filename?: string

  /**
   * ファイルを上書きするか
   */
  upsert?: boolean

  /**
   * コンテンツタイプを指定
   */
  contentType?: string
}

export interface StorageConfig {
  /**
   * ストレージのバケット名
   */
  bucket: string

  /**
   * 最大ファイルサイズ（バイト）
   */
  maxFileSize: number

  /**
   * 許可するファイルタイプ
   */
  allowedTypes: string[]
}

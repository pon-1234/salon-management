"use client"

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Upload, Loader2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface ImageUploadProps {
  value: string
  onChange: (url: string) => void
  onRemove: () => void
  index: number
  disabled?: boolean
}

export function ImageUpload({ value, onChange, onRemove, index, disabled }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // クライアントサイドバリデーション
    const maxSize = 5 * 1024 * 1024 // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

    if (file.size > maxSize) {
      toast({
        title: 'エラー',
        description: 'ファイルサイズが大きすぎます（最大5MB）',
        variant: 'destructive'
      })
      return
    }

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'エラー',
        description: '対応していないファイル形式です（JPEG, PNG, WebPのみ）',
        variant: 'destructive'
      })
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        onChange(result.url)
        toast({
          title: '成功',
          description: '画像をアップロードしました'
        })
      } else {
        throw new Error(result.error || 'アップロードに失敗しました')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'アップロードに失敗しました',
        variant: 'destructive'
      })
    } finally {
      setIsUploading(false)
      // ファイル入力をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Label className="min-w-[60px]">画像{index + 1}</Label>
      
      <div className="flex-1 space-y-2">
        {value ? (
          <div className="flex items-center gap-2">
            <img 
              src={value} 
              alt={`プレビュー ${index + 1}`}
              className="w-16 h-16 object-cover rounded border"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
            <span className="text-sm text-gray-600 flex-1 truncate">{value}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={disabled || isUploading}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
              className="flex-1"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  アップロード中...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  画像を選択
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRemove}
        disabled={disabled}
        className="px-2"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
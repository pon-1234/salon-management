'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState, useCallback, useMemo } from 'react'

interface FilterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApplyFilters: (filters: FilterOptions) => void
}

export interface FilterOptions {
  workStatus: '出勤' | '未出勤' | 'すべて'
  courseType: 'イベントコース' | '基本コース' | 'すべて'
  name: string
  ageRange: string
  heightRange: string
  bustSize: string
  waistRange: string
  type: string
}

const initialFilters: FilterOptions = {
  workStatus: 'すべて',
  courseType: 'すべて',
  name: '',
  ageRange: '',
  heightRange: '',
  bustSize: '',
  waistRange: '',
  type: '',
}

export function FilterDialog({ open, onOpenChange, onApplyFilters }: FilterDialogProps) {
  const [filters, setFilters] = useState<FilterOptions>(initialFilters)

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      onApplyFilters(filters)
      onOpenChange(false)
    },
    [filters, onApplyFilters, onOpenChange]
  )

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFilters((prev) => ({ ...prev, [name]: value }))
  }, [])

  const handleButtonClick = useCallback((name: string, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }))
  }, [])

  const ageRanges = useMemo(
    () => ['18-19歳', '20-24歳', '25-29歳', '30-34歳', '35-39歳', '40歳以上'],
    []
  )
  const heightRanges = useMemo(
    () => ['149cm以下', '150-154cm', '155-159cm', '160-164cm', '165-169cm', '170cm以上'],
    []
  )
  const bustSizes = useMemo(() => ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I以上'], [])
  const waistRanges = useMemo(
    () => [
      '49cm以下',
      '50-54cm',
      '55-59cm',
      '60-64cm',
      '65-69cm',
      '70-74cm',
      '75-79cm',
      '80cm以上',
    ],
    []
  )
  const types = useMemo(() => ['カワイイ系', 'キレイ系', 'ロリ系', '人妻系'], [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">絞り込み</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 勤務状況で絞り込み */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">2024年12月09日の勤務状況で絞り込み</h3>
            <div className="flex gap-2">
              {['出勤', '未出勤', 'すべて'].map((status) => (
                <Button
                  key={status}
                  type="button"
                  onClick={() => handleButtonClick('workStatus', status)}
                  variant={filters.workStatus === status ? 'default' : 'outline'}
                  className={filters.workStatus === status ? 'bg-emerald-600' : ''}
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>

          {/* コースで絞り込み */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">コースで絞り込み</h3>
            <div className="flex gap-2">
              {['イベントコース', '基本コース', 'すべて'].map((course) => (
                <Button
                  key={course}
                  type="button"
                  onClick={() => handleButtonClick('courseType', course)}
                  variant={filters.courseType === course ? 'default' : 'outline'}
                  className={filters.courseType === course ? 'bg-emerald-600' : ''}
                >
                  {course === 'すべて' ? course : `${course}（税込）`}
                </Button>
              ))}
            </div>
          </div>

          {/* 名前で絞り込み */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">名前（ふりがな）で絞り込み</h3>
            <div>
              <Label htmlFor="name">名前</Label>
              <Input
                id="name"
                name="name"
                value={filters.name}
                onChange={handleInputChange}
                placeholder="例：はまれ"
                className="mt-2"
              />
            </div>
          </div>

          {/* サイズで絞り込み */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">サイズで絞り込み</h3>

            {/* 年齢 */}
            <div>
              <Label>年齢</Label>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {ageRanges.map((age) => (
                  <Button
                    key={age}
                    type="button"
                    onClick={() => handleButtonClick('ageRange', age)}
                    variant={filters.ageRange === age ? 'default' : 'outline'}
                    className={filters.ageRange === age ? 'bg-emerald-600' : ''}
                  >
                    {age}
                  </Button>
                ))}
              </div>
            </div>

            {/* 身長 */}
            <div>
              <Label>身長</Label>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {heightRanges.map((height) => (
                  <Button
                    key={height}
                    type="button"
                    onClick={() => handleButtonClick('heightRange', height)}
                    variant={filters.heightRange === height ? 'default' : 'outline'}
                    className={filters.heightRange === height ? 'bg-emerald-600' : ''}
                  >
                    {height}
                  </Button>
                ))}
              </div>
            </div>

            {/* バスト */}
            <div>
              <Label>バスト</Label>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-9">
                {bustSizes.map((size) => (
                  <Button
                    key={size}
                    type="button"
                    onClick={() => handleButtonClick('bustSize', size)}
                    variant={filters.bustSize === size ? 'default' : 'outline'}
                    className={filters.bustSize === size ? 'bg-emerald-600' : ''}
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>

            {/* ウエスト */}
            <div>
              <Label>ウエスト</Label>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-8">
                {waistRanges.map((size) => (
                  <Button
                    key={size}
                    type="button"
                    onClick={() => handleButtonClick('waistRange', size)}
                    variant={filters.waistRange === size ? 'default' : 'outline'}
                    className={filters.waistRange === size ? 'bg-emerald-600' : ''}
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* タイプで絞り込み */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">タイプ</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {types.map((type) => (
                <Button
                  key={type}
                  type="button"
                  onClick={() => handleButtonClick('type', type)}
                  variant={filters.type === type ? 'default' : 'outline'}
                  className={filters.type === type ? 'bg-emerald-600' : ''}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFilters(initialFilters)
                onOpenChange(false)
              }}
            >
              キャンセル
            </Button>
            <Button type="submit" className="bg-emerald-600">
              適用
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

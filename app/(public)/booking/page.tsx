'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Clock, User } from 'lucide-react'
import { getCourses } from '@/lib/course-option/data'
import { Course } from '@/lib/types/course-option'

export default function BookingPage() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [selectedCast, setSelectedCast] = useState<string>('')
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')

  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  
  const casts = [
    { id: '1', name: 'キャスト A', available: true },
    { id: '2', name: 'キャスト B', available: true },
    { id: '3', name: 'キャスト C', available: false },
    { id: '4', name: 'キャスト D', available: true },
  ]

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const fetchedCourses = await getCourses()
        setCourses(fetchedCourses)
      } catch (error) {
        console.error('Failed to load courses:', error)
      } finally {
        setLoading(false)
      }
    }
    loadCourses()
  }, [])

  const timeSlots = [
    '10:00', '11:00', '12:00', '13:00', '14:00', '15:00',
    '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">予約</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Date Selection */}
          <Card>
            <CardHeader>
              <CardTitle>日付を選択</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                locale={ja}
                className="rounded-md border"
                disabled={(date) => date < new Date()}
              />
            </CardContent>
          </Card>

          {/* Cast Selection */}
          <Card>
            <CardHeader>
              <CardTitle>キャストを選択</CardTitle>
              <CardDescription>
                ご希望のキャストをお選びください
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={selectedCast} onValueChange={setSelectedCast}>
                <div className="space-y-3">
                  {casts.map((cast) => (
                    <div key={cast.id} className="flex items-center space-x-2">
                      <RadioGroupItem 
                        value={cast.id} 
                        id={cast.id}
                        disabled={!cast.available}
                      />
                      <Label 
                        htmlFor={cast.id} 
                        className={`flex items-center gap-2 cursor-pointer ${!cast.available ? 'opacity-50' : ''}`}
                      >
                        <User className="h-4 w-4" />
                        {cast.name}
                        {!cast.available && <span className="text-sm text-gray-500">（予約不可）</span>}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Course Selection */}
          <Card>
            <CardHeader>
              <CardTitle>コースを選択</CardTitle>
              <CardDescription>
                ご希望のコースをお選びください
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={selectedCourse} onValueChange={setSelectedCourse}>
                <div className="space-y-3">
                  {loading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-500">コース情報を読み込み中...</p>
                    </div>
                  ) : courses.length === 0 ? (
                    <p className="text-gray-500">利用可能なコースがありません</p>
                  ) : (
                    courses.map((course) => (
                      <div key={course.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={course.id} id={`course-${course.id}`} />
                        <Label htmlFor={`course-${course.id}`} className="flex-1 cursor-pointer">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium">{course.name}</div>
                              <div className="text-sm text-gray-500">{course.duration}分</div>
                            </div>
                            <div className="font-semibold">¥{course.price.toLocaleString()}</div>
                          </div>
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Time Selection */}
          <Card>
            <CardHeader>
              <CardTitle>時間を選択</CardTitle>
              <CardDescription>
                {date && format(date, 'M月d日(E)', { locale: ja })}の空き時間
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {timeSlots.map((time) => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedTime(time)}
                    className="w-full"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    {time}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Confirmation */}
          <Card>
            <CardHeader>
              <CardTitle>予約内容の確認</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">日付</span>
                <span>{date ? format(date, 'yyyy年M月d日(E)', { locale: ja }) : '未選択'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">時間</span>
                <span>{selectedTime || '未選択'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">キャスト</span>
                <span>{casts.find(c => c.id === selectedCast)?.name || '未選択'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">コース</span>
                <span>{courses.find(c => c.id === selectedCourse)?.name || '未選択'}</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span>合計</span>
                <span>
                  ¥{courses.find(c => c.id === selectedCourse)?.price.toLocaleString() || '0'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Button 
            className="w-full" 
            size="lg"
            disabled={!date || !selectedCast || !selectedCourse || !selectedTime}
          >
            予約を確定する
          </Button>
        </div>
      </div>
    </div>
  )
}
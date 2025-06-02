"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Cast } from "@/lib/cast/types"
import { NgCastEntry } from "@/lib/customer/types"

const ngCastSchema = z.object({
  castId: z.string().min(1, "キャストを選択してください"),
  notes: z.string().max(500, "備考は500文字以内で入力してください").optional(),
})

type NgCastFormData = z.infer<typeof ngCastSchema>

interface NgCastDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  availableCasts: Cast[]
  existingNgCasts: NgCastEntry[]
  editingNgCast?: NgCastEntry | null
  onSave: (ngCast: NgCastEntry) => void
}

export function NgCastDialog({
  open,
  onOpenChange,
  availableCasts,
  existingNgCasts,
  editingNgCast,
  onSave,
}: NgCastDialogProps) {
  const isEditing = !!editingNgCast

  const form = useForm<NgCastFormData>({
    resolver: zodResolver(ngCastSchema),
    defaultValues: {
      castId: editingNgCast?.castId || "",
      notes: editingNgCast?.notes || "",
    },
  })

  // Reset form when dialog opens/closes or editing cast changes
  useEffect(() => {
    if (open) {
      form.reset({
        castId: editingNgCast?.castId || "",
        notes: editingNgCast?.notes || "",
      })
    }
  }, [open, editingNgCast, form])

  const handleSave = (data: NgCastFormData) => {
    const ngCastEntry: NgCastEntry = {
      castId: data.castId,
      notes: data.notes,
      addedDate: editingNgCast?.addedDate || new Date(),
    }
    
    onSave(ngCastEntry)
    form.reset()
    onOpenChange(false)
  }

  const handleCancel = () => {
    form.reset()
    onOpenChange(false)
  }

  // Filter out casts that are already in NG list (except when editing the current one)
  const selectableCasts = availableCasts.filter(cast => {
    const isAlreadyNg = existingNgCasts.some(ng => ng.castId === cast.id)
    const isCurrentlyEditing = editingNgCast?.castId === cast.id
    return !isAlreadyNg || isCurrentlyEditing
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "NGキャスト編集" : "NGキャスト追加"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "NGキャストの情報を編集します。" 
              : "新しいNGキャストを追加します。備考には理由や詳細を記入できます。"
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
            <FormField
              control={form.control}
              name="castId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>キャスト <span className="text-red-500">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isEditing}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="キャストを選択してください" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {selectableCasts.map((cast) => (
                        <SelectItem key={cast.id} value={cast.id}>
                          <div className="flex items-center gap-3">
                            <img
                              src={cast.image || "/placeholder.svg"}
                              alt={cast.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <div>
                              <div className="font-medium">{cast.name}</div>
                              <div className="text-sm text-gray-500">{cast.type}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>備考</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="NGの理由や詳細を記入してください（任意）"
                      className="min-h-[100px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <div className="text-sm text-gray-500">
                    {field.value?.length || 0}/500文字
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel}>
                キャンセル
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700">
                {isEditing ? "更新" : "追加"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
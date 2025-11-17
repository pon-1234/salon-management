'use client'

import { useState, type ReactNode } from 'react'
import * as z from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'

const adjustmentSchema = z.object({
  amount: z
    .coerce.number()
    .int()
    .refine((value) => value !== 0, { message: '1pt以上の加算または減算を入力してください' }),
  reason: z.string().min(5, '理由は5文字以上で入力してください'),
})

type AdjustmentFormValues = z.infer<typeof adjustmentSchema>

interface PointAdjustmentDialogProps {
  customerId: string
  customerName?: string
  trigger?: ReactNode
  onAdjusted?: (delta: number) => void
}

export function PointAdjustmentDialog({
  customerId,
  customerName,
  trigger,
  onAdjusted,
}: PointAdjustmentDialogProps) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const form = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      amount: 0,
      reason: '',
    },
  })

  const handleSubmit = async (values: AdjustmentFormValues) => {
    setSubmitting(true)
    try {
      const response = await fetch('/api/customer/points/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          customerId,
          amount: values.amount,
          reason: values.reason,
        }),
      })

      if (!response.ok) {
        throw new Error('ポイント調整に失敗しました')
      }

      toast({
        title: 'ポイントを更新しました',
        description:
          values.amount > 0
            ? `${values.amount.toLocaleString()}ptを加算しました`
            : `${Math.abs(values.amount).toLocaleString()}ptを減算しました`,
      })

      form.reset()
      setOpen(false)
      onAdjusted?.(values.amount)
    } catch (error) {
      toast({
        title: 'エラー',
        description:
          error instanceof Error ? error.message : 'ポイント調整の処理に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="outline">ポイント調整</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ポイント調整</DialogTitle>
          <DialogDescription>
            {customerName ? `${customerName} 様のポイントを手動で加算・減算します。` : ''}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>調整ポイント</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="例: 500 (加算) または -500 (減算)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>理由</FormLabel>
                  <FormControl>
                    <Textarea placeholder="調整理由を入力してください" rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                キャンセル
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? '処理中...' : 'ポイントを更新'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

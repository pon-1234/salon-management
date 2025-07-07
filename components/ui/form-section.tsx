import { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'

interface FormSectionProps {
  title: string
  icon?: ReactNode
  children: ReactNode
  editable?: boolean
  onEdit?: () => void
  className?: string
}

export function FormSection({
  title,
  icon,
  children,
  editable = false,
  onEdit,
  className = '',
}: FormSectionProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          {editable && onEdit && (
            <Button variant="ghost" size="icon" onClick={onEdit} className="text-emerald-600">
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

interface FormFieldProps {
  label: string
  value: string | number
  className?: string
}

export function FormField({ label, value, className = '' }: FormFieldProps) {
  return (
    <div className={`flex justify-between ${className}`}>
      <span className="text-gray-600">{label}</span>
      <span>{value}</span>
    </div>
  )
}

interface FormRowProps {
  children: ReactNode
  className?: string
}

export function FormRow({ children, className = 'space-y-2' }: FormRowProps) {
  return <div className={className}>{children}</div>
}

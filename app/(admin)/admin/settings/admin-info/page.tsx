'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  Shield,
  UserPlus,
  Loader2,
  Edit,
  Trash2,
  RefreshCw,
  Mail,
  Users,
  UserCheck,
} from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'
import { cn } from '@/lib/utils'

const JST_TIMEZONE = 'Asia/Tokyo'

type AdminRecord = {
  id: string
  email: string
  name: string
  role: 'super_admin' | 'manager' | 'staff'
  permissions: string[]
  isActive: boolean
  lastLogin: string | null
  createdAt: string
  updatedAt: string
}

type AdminFormState = {
  email: string
  name: string
  password: string
  role: 'super_admin' | 'manager' | 'staff'
  permissionsText: string
  isActive: boolean
}

const ROLE_LABELS: Record<AdminRecord['role'], string> = {
  super_admin: 'スーパー管理者',
  manager: 'マネージャー',
  staff: 'スタッフ',
}

const roleOptions: Array<{ value: AdminRecord['role']; label: string }> = [
  { value: 'super_admin', label: ROLE_LABELS.super_admin },
  { value: 'manager', label: ROLE_LABELS.manager },
  { value: 'staff', label: ROLE_LABELS.staff },
]

export default function AdminInfoPage() {
  const { data: session } = useSession()
  const { toast } = useToast()

  const [admins, setAdmins] = useState<AdminRecord[]>([])
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<AdminRecord | null>(null)
  const [formState, setFormState] = useState<AdminFormState>({
    email: '',
    name: '',
    password: '',
    role: 'staff',
    permissionsText: '',
    isActive: true,
  })

  const isSuperAdmin = session?.user?.adminRole === 'super_admin'

  const fetchAdmins = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin', {
        cache: 'no-store',
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error(await response.text())
      }
      const payload = await response.json()
      const list = payload?.admins ?? payload ?? []
      setAdmins(Array.isArray(list) ? list : [])
      setLastSyncedAt(new Date())
    } catch (error) {
      console.error('Failed to load admins:', error)
      toast({
        title: 'エラー',
        description: '管理者情報の取得に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdmins()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openCreateDialog = () => {
    setEditingAdmin(null)
    setFormState({
      email: '',
      name: '',
      password: '',
      role: 'staff',
      permissionsText: '',
      isActive: true,
    })
    setDialogOpen(true)
  }

  const openEditDialog = (admin: AdminRecord) => {
    setEditingAdmin(admin)
    setFormState({
      email: admin.email,
      name: admin.name,
      password: '',
      role: admin.role,
      permissionsText: admin.permissions.join('\n'),
      isActive: admin.isActive,
    })
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingAdmin(null)
    setFormState({
      email: '',
      name: '',
      password: '',
      role: 'staff',
      permissionsText: '',
      isActive: true,
    })
  }

  const handleInputChange = (field: keyof AdminFormState, value: string | boolean) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const parsePermissions = (text: string) =>
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

  const handleSubmit = async () => {
    if (saving) return
    if (formState.role === 'super_admin' && !isSuperAdmin) {
      toast({
        title: '権限エラー',
        description: 'スーパー管理者のみがこの操作を行えます',
        variant: 'destructive',
      })
      return
    }

    if (!formState.email || !formState.name) {
      toast({
        title: '入力エラー',
        description: 'メールアドレスと名前は必須です。',
        variant: 'destructive',
      })
      return
    }

    if (!editingAdmin && !formState.password) {
      toast({
        title: '入力エラー',
        description: '初期パスワードを入力してください。',
        variant: 'destructive',
      })
      return
    }

    const permissions = parsePermissions(formState.permissionsText)

    try {
      setSaving(true)
      let response: Response
      if (editingAdmin) {
        const body: Record<string, unknown> = { id: editingAdmin.id }
        if (formState.email !== editingAdmin.email) body.email = formState.email
        if (formState.name !== editingAdmin.name) body.name = formState.name
        if (formState.role !== editingAdmin.role) body.role = formState.role
        if (formState.password) body.password = formState.password
        if (formState.isActive !== editingAdmin.isActive) body.isActive = formState.isActive
        if (formState.permissionsText !== editingAdmin.permissions.join('\n'))
          body.permissions = permissions

        if (Object.keys(body).length === 1) {
          toast({
            title: '変更なし',
            description: '更新内容がありません。',
            variant: 'destructive',
          })
          setSaving(false)
          return
        }

        response = await fetch('/api/admin', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        })
      } else {
        response = await fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            email: formState.email,
            name: formState.name,
            password: formState.password,
            role: formState.role,
            permissions,
            isActive: formState.isActive,
          }),
        })
      }

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || '処理に失敗しました')
      }

      toast({
        title: editingAdmin ? '管理者を更新しました' : '管理者を追加しました',
      })
      closeDialog()
      fetchAdmins()
    } catch (error) {
      console.error('Failed to save admin:', error)
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : '管理者情報の保存に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (admin: AdminRecord) => {
    if (!isSuperAdmin) return
    if (!window.confirm(`「${admin.name}」を削除しますか？`)) {
      return
    }

    try {
      setSaving(true)
      const response = await fetch(`/api/admin?id=${encodeURIComponent(admin.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || '削除に失敗しました')
      }
      toast({
        title: '削除しました',
        description: `${admin.name} を削除しました。`,
      })
      fetchAdmins()
    } catch (error) {
      console.error('Failed to delete admin:', error)
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : '管理者の削除に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const adminStats = useMemo(() => {
    const total = admins.length
    const active = admins.filter((admin) => admin.isActive).length
    const inactive = total - active
    const superAdmin = admins.filter((admin) => admin.role === 'super_admin').length
    const manager = admins.filter((admin) => admin.role === 'manager').length
    const staff = admins.filter((admin) => admin.role === 'staff').length

    return {
      total,
      active,
      inactive,
      superAdmin,
      manager,
      staff,
    }
  }, [admins])

  const sortedAdmins = useMemo(
    () =>
      [...admins].sort((a, b) => {
        if (a.role === 'super_admin' && b.role !== 'super_admin') return -1
        if (a.role !== 'super_admin' && b.role === 'super_admin') return 1
        return a.name.localeCompare(b.name, 'ja')
      }),
    [admins]
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/admin/settings">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <Shield className="h-8 w-8 text-emerald-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">管理者情報</h1>
              <p className="text-sm text-gray-600">
                管理画面にアクセスできるメンバーのアカウントや権限を管理します。
              </p>
            </div>
            <div className="flex-1" />
            {lastSyncedAt && (
              <span className="mr-4 hidden text-xs text-gray-500 md:block">
                最終更新 {formatInTimeZone(lastSyncedAt, JST_TIMEZONE, 'MM/dd HH:mm')}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={fetchAdmins} disabled={loading}>
              <RefreshCw className={cn('mr-2 h-4 w-4', loading ? 'animate-spin' : '')} />
              再読み込み
            </Button>
            <Button onClick={openCreateDialog} disabled={!isSuperAdmin}>
              <UserPlus className="mr-2 h-4 w-4" />
              管理者を追加
            </Button>
          </div>
          {lastSyncedAt && (
            <p className="text-xs text-gray-500 md:hidden">
              最終更新 {formatInTimeZone(lastSyncedAt, JST_TIMEZONE, 'MM/dd HH:mm')}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">登録管理者</CardTitle>
                <Users className="h-5 w-5 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{adminStats.total}名</div>
                <p className="text-xs text-gray-500">うち {adminStats.active} 名が有効です</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">有効アカウント</CardTitle>
                <UserCheck className="h-5 w-5 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{adminStats.active}名</div>
                <p className="text-xs text-gray-500">{adminStats.inactive} 名が停止中</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">権限内訳</CardTitle>
                <Shield className="h-5 w-5 text-emerald-600" />
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">スーパー管理者</span>
                  <span className="font-semibold">{adminStats.superAdmin}名</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">マネージャー</span>
                  <span className="font-semibold">{adminStats.manager}名</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">スタッフ</span>
                  <span className="font-semibold">{adminStats.staff}名</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-600" />
                管理者一覧
                <Badge variant="outline" className="ml-2">
                  {sortedAdmins.length}名
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  読み込み中...
                </div>
              ) : sortedAdmins.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
                  登録されている管理者がいません
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>氏名</TableHead>
                      <TableHead>メールアドレス</TableHead>
                      <TableHead>権限</TableHead>
                      <TableHead>許可範囲</TableHead>
                      <TableHead>最終ログイン</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead className="w-[140px] text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedAdmins.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell>
                          <div className="font-medium">{admin.name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span>{admin.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              admin.role === 'super_admin'
                                ? 'bg-purple-600'
                                : admin.role === 'manager'
                                  ? 'bg-emerald-600'
                                  : 'bg-gray-600',
                              'text-white'
                            )}
                          >
                            {ROLE_LABELS[admin.role]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {admin.permissions.length === 0 ? (
                            <span className="text-xs text-gray-500">設定なし</span>
                          ) : (
                            <div className="flex max-w-[260px] flex-wrap gap-1">
                              {admin.permissions.slice(0, 3).map((permission) => (
                                <Badge
                                  key={permission}
                                  variant="outline"
                                  className="whitespace-nowrap text-xs font-normal"
                                  title={permission}
                                >
                                  {permission}
                                </Badge>
                              ))}
                              {admin.permissions.length > 3 && (
                                <Badge
                                  variant="secondary"
                                  className="whitespace-nowrap text-xs font-normal text-gray-700"
                                >
                                  +{admin.permissions.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {admin.lastLogin
                            ? formatInTimeZone(new Date(admin.lastLogin), JST_TIMEZONE, 'yyyy/MM/dd HH:mm')
                            : '未ログイン'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={admin.isActive ? 'success' : 'secondary'}>
                            {admin.isActive ? '有効' : '停止'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openEditDialog(admin)}
                              disabled={!isSuperAdmin}
                              title="編集"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDelete(admin)}
                              disabled={!isSuperAdmin || saving}
                              title="削除"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={(open) => (!open ? closeDialog() : setDialogOpen(open))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAdmin ? '管理者を編集' : '管理者を追加'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-name">氏名</Label>
              <Input
                id="admin-name"
                value={formState.name}
                onChange={(event) => handleInputChange('name', event.target.value)}
                placeholder="山田 太郎"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-email">メールアドレス</Label>
              <Input
                id="admin-email"
                type="email"
                value={formState.email}
                onChange={(event) => handleInputChange('email', event.target.value)}
                placeholder="admin@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-role">権限</Label>
              <Select
                value={formState.role}
                onValueChange={(value) => handleInputChange('role', value as AdminFormState['role'])}
                disabled={!isSuperAdmin}
              >
                <SelectTrigger id="admin-role">
                  <SelectValue placeholder="権限を選択" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password">
                {editingAdmin ? '新しいパスワード（任意）' : '初期パスワード'}
              </Label>
              <Input
                id="admin-password"
                type="password"
                value={formState.password}
                onChange={(event) => handleInputChange('password', event.target.value)}
                placeholder={editingAdmin ? '変更しない場合は未入力' : '8文字以上'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-permissions">権限（1行に1つ）</Label>
              <textarea
                id="admin-permissions"
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formState.permissionsText}
                onChange={(event) => handleInputChange('permissionsText', event.target.value)}
                placeholder="例）\nreservation:read\nreservation:write"
              />
              <p className="text-xs text-gray-500">設定しない場合は空欄のままで構いません。</p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="admin-status" className="text-sm font-medium">
                  アカウント有効
                </Label>
                <p className="text-xs text-gray-500">無効にするとログインできなくなります。</p>
              </div>
              <Switch
                id="admin-status"
                checked={formState.isActive}
                onCheckedChange={(value) => handleInputChange('isActive', value)}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeDialog} disabled={saving}>
                キャンセル
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : editingAdmin ? (
                  '更新する'
                ) : (
                  '追加する'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

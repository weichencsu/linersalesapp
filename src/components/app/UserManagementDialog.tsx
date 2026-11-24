'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Pencil, Plus, ShieldCheck, Trash2, User, KeyRound, Users } from 'lucide-react'
import { useI18n, translateServerError } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { AuthUser, ManagedUser } from '@/lib/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUser: AuthUser
  onCurrentUserChange: (u: AuthUser) => void
}

function fmtDate(iso: string | null, lang: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function countLabel(n: number, t: (k: 'um.count' | 'um.countOne', vars?: Record<string, string | number>) => string): string {
  return n === 1 ? t('um.countOne') : t('um.count', { n })
}

// 用户管理（仅管理员）：列表 / 新建 / 编辑 / 重置密码 / 停用 / 删除
export default function UserManagementDialog({ open, onOpenChange, currentUser, onCurrentUserChange }: Props) {
  const { t, lang } = useI18n()
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(false)

  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ username: '', displayName: '', password: '', confirm: '', role: 'USER' })
  const [addBusy, setAddBusy] = useState(false)

  const [editTarget, setEditTarget] = useState<ManagedUser | null>(null)
  const [editForm, setEditForm] = useState({ displayName: '', role: 'USER' })
  const [editBusy, setEditBusy] = useState(false)

  const [resetTarget, setResetTarget] = useState<ManagedUser | null>(null)
  const [resetForm, setResetForm] = useState({ password: '', confirm: '' })
  const [resetBusy, setResetBusy] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/users')
      if (!res.ok) throw new Error()
      setUsers(await res.json())
    } catch {
      toast.error(t('um.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (open) {
      load()
      setAddForm({ username: '', displayName: '', password: '', confirm: '', role: 'USER' })
    }
  }, [open, load])

  // ---- 新建用户 ----
  const submitAdd = async () => {
    if (!addForm.username.trim()) return toast.error(t('auth.usernameRequired'))
    if (addForm.password.length < 6) return toast.error(t('cp.tooShort'))
    if (addForm.password !== addForm.confirm) return toast.error(t('auth.pwMismatch'))
    setAddBusy(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: addForm.username,
          password: addForm.password,
          displayName: addForm.displayName,
          role: addForm.role,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('common.saveFailed'))
      toast.success(t('um.userCreated', { u: data.username }))
      setAddOpen(false)
      load()
    } catch (e) {
      toast.error(translateServerError(e instanceof Error ? e.message : t('common.saveFailed'), lang))
    } finally {
      setAddBusy(false)
    }
  }

  // ---- 编辑用户（显示名 / 角色） ----
  const openEdit = (u: ManagedUser) => {
    setEditTarget(u)
    setEditForm({ displayName: u.displayName, role: u.role })
  }

  const submitEdit = async () => {
    if (!editTarget) return
    setEditBusy(true)
    try {
      const res = await fetch(`/api/users/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: editForm.displayName, role: editForm.role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('common.saveFailed'))
      toast.success(t('um.userUpdated'))
      // 若编辑的是自己（显示名），同步头部用户状态
      if (data.id === currentUser.id) {
        onCurrentUserChange({ ...currentUser, displayName: data.displayName, role: data.role })
      }
      setEditTarget(null)
      load()
    } catch (e) {
      toast.error(translateServerError(e instanceof Error ? e.message : t('common.saveFailed'), lang))
    } finally {
      setEditBusy(false)
    }
  }

  // ---- 启用 / 停用 ----
  const toggleActive = async (u: ManagedUser) => {
    setTogglingId(u.id)
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !u.isActive }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('common.saveFailed'))
      toast.success(data.isActive ? t('um.userEnabled', { u: u.username }) : t('um.userDisabled', { u: u.username }))
      load()
    } catch (e) {
      toast.error(translateServerError(e instanceof Error ? e.message : t('common.saveFailed'), lang))
    } finally {
      setTogglingId(null)
    }
  }

  // ---- 重置密码 ----
  const submitReset = async () => {
    if (!resetTarget) return
    if (resetForm.password.length < 6) return toast.error(t('cp.tooShort'))
    if (resetForm.password !== resetForm.confirm) return toast.error(t('auth.pwMismatch'))
    setResetBusy(true)
    try {
      const res = await fetch(`/api/users/${resetTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetForm.password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('common.saveFailed'))
      toast.success(t('um.passwordReset', { u: resetTarget.username }))
      setResetTarget(null)
    } catch (e) {
      toast.error(translateServerError(e instanceof Error ? e.message : t('common.saveFailed'), lang))
    } finally {
      setResetBusy(false)
    }
  }

  // ---- 删除用户 ----
  const submitDelete = async () => {
    if (!deleteTarget) return
    setDeleteBusy(true)
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('common.delete'))
      toast.success(t('um.userDeleted', { u: deleteTarget.username }))
      setDeleteTarget(null)
      load()
    } catch (e) {
      toast.error(translateServerError(e instanceof Error ? e.message : t('common.delete'), lang))
    } finally {
      setDeleteBusy(false)
    }
  }

  const roleBadge = (role: string) => (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 whitespace-nowrap',
        role === 'ADMIN'
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
          : 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300'
      )}
    >
      {role === 'ADMIN' ? <ShieldCheck className="h-3 w-3" /> : <User className="h-3 w-3" />}
      {role === 'ADMIN' ? t('user.role.admin') : t('user.role.user')}
    </Badge>
  )

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />{t('um.title')}
            </DialogTitle>
            <DialogDescription>{t('um.desc')}</DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">{countLabel(users.length, t)}</div>
            <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />{t('um.addUser')}
            </Button>
          </div>

          <div className="max-h-[420px] overflow-auto rounded-lg border [scrollbar-width:thin]">
            <Table className="w-full min-w-[720px]">
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead>{t('um.col.username')}</TableHead>
                  <TableHead>{t('um.col.displayName')}</TableHead>
                  <TableHead>{t('um.col.role')}</TableHead>
                  <TableHead className="text-center">{t('um.col.status')}</TableHead>
                  <TableHead>{t('um.col.lastLogin')}</TableHead>
                  <TableHead className="w-28 text-right">{t('um.col.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </TableCell>
                  </TableRow>
                )}
                {users.map((u) => {
                  const isSelf = u.id === currentUser.id
                  return (
                    <TableRow key={u.id} className={cn(!u.isActive && 'opacity-55')}>
                      <TableCell>
                        <span className="font-medium">{u.username}</span>
                        {isSelf && <span className="ml-1.5 text-xs text-emerald-600 dark:text-emerald-400">{t('user.you')}</span>}
                      </TableCell>
                      <TableCell className="text-sm">{u.displayName || '—'}</TableCell>
                      <TableCell>{roleBadge(u.role)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Switch
                            checked={u.isActive}
                            disabled={isSelf || togglingId === u.id}
                            onCheckedChange={() => toggleActive(u)}
                            title={isSelf ? t('um.cannotSelf') : undefined}
                          />
                          <span className={cn('whitespace-nowrap text-xs', u.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>
                            {u.isActive ? t('um.active') : t('um.inactive')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs tabular-nums">{fmtDate(u.lastLoginAt, lang)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-0.5">
                          <Button size="icon" variant="ghost" className="h-7 w-7" title={t('um.editUser')}
                            onClick={() => openEdit(u)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" title={t('um.resetPassword')}
                            onClick={() => { setResetTarget(u); setResetForm({ password: '', confirm: '' }) }}>
                            <KeyRound className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon" variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            title={isSelf ? t('um.cannotSelf') : t('um.deleteUser')}
                            disabled={isSelf}
                            onClick={() => setDeleteTarget(u)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {!loading && users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      {t('um.empty')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground">{t('um.hint')}</p>
        </DialogContent>
      </Dialog>

      {/* ---- 新建用户 ---- */}
      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setAddForm({ username: '', displayName: '', password: '', confirm: '', role: 'USER' }) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('um.addUser')}</DialogTitle>
            <DialogDescription>{t('um.addDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t('auth.username')} *</Label>
              <Input
                value={addForm.username}
                onChange={(e) => setAddForm((p) => ({ ...p, username: e.target.value }))}
                placeholder={t('um.newUsernamePh')}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('auth.displayName')}</Label>
              <Input
                value={addForm.displayName}
                onChange={(e) => setAddForm((p) => ({ ...p, displayName: e.target.value }))}
                placeholder={t('auth.displayNamePh')}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('auth.password')} *</Label>
              <Input
                type="password" autoComplete="new-password"
                value={addForm.password}
                onChange={(e) => setAddForm((p) => ({ ...p, password: e.target.value }))}
                placeholder={t('um.pwHint')}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('auth.confirmPassword')} *</Label>
              <Input
                type="password" autoComplete="new-password"
                value={addForm.confirm}
                onChange={(e) => setAddForm((p) => ({ ...p, confirm: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && submitAdd()}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('um.col.role')}</Label>
              <Select value={addForm.role} onValueChange={(v) => setAddForm((p) => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">{t('um.roleUser')}</SelectItem>
                  <SelectItem value="ADMIN">{t('um.roleAdmin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={submitAdd} disabled={addBusy} className="gap-1.5">
              {addBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('um.addUser')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- 编辑用户 ---- */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('um.editUser')}</DialogTitle>
            <DialogDescription>{t('um.editDesc', { u: editTarget?.username ?? '' })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t('auth.displayName')}</Label>
              <Input
                value={editForm.displayName}
                onChange={(e) => setEditForm((p) => ({ ...p, displayName: e.target.value }))}
                placeholder={t('auth.displayNamePh')}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('um.col.role')}</Label>
              <Select
                value={editForm.role}
                onValueChange={(v) => setEditForm((p) => ({ ...p, role: v }))}
                disabled={editTarget?.id === currentUser.id}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">{t('um.roleUser')}</SelectItem>
                  <SelectItem value="ADMIN">{t('um.roleAdmin')}</SelectItem>
                </SelectContent>
              </Select>
              {editTarget?.id === currentUser.id && (
                <p className="text-xs text-muted-foreground">{t('um.cannotSelf')}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>{t('common.cancel')}</Button>
            <Button onClick={submitEdit} disabled={editBusy} className="gap-1.5">
              {editBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- 重置密码 ---- */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />{t('um.resetPassword')}
            </DialogTitle>
            <DialogDescription>{t('um.resetDesc', { u: resetTarget?.username ?? '' })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t('um.newPassword')} *</Label>
              <Input
                type="password" autoComplete="new-password"
                value={resetForm.password}
                onChange={(e) => setResetForm((p) => ({ ...p, password: e.target.value }))}
                placeholder={t('um.pwHint')}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('auth.confirmPassword')} *</Label>
              <Input
                type="password" autoComplete="new-password"
                value={resetForm.confirm}
                onChange={(e) => setResetForm((p) => ({ ...p, confirm: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && submitReset()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>{t('common.cancel')}</Button>
            <Button onClick={submitReset} disabled={resetBusy} className="gap-1.5">
              {resetBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('um.resetPassword')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- 删除确认 ---- */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('um.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('um.deleteMsg', { u: deleteTarget?.username ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={submitDelete} disabled={deleteBusy} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

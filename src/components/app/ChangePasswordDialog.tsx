'use client'

import { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { KeyRound } from 'lucide-react'
import { useI18n, translateServerError } from '@/lib/i18n'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// 修改自己的密码
export default function ChangePasswordDialog({ open, onOpenChange }: Props) {
  const { t, lang } = useI18n()
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm({ current: '', next: '', confirm: '' })
  }, [open])

  const submit = async () => {
    if (!form.current) return toast.error(t('cp.wrongCurrent'))
    if (form.next.length < 6) return toast.error(t('cp.tooShort'))
    if (form.next !== form.confirm) return toast.error(t('cp.mismatch'))
    setSaving(true)
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('common.saveFailed'))
      toast.success(t('cp.changed'))
      onOpenChange(false)
    } catch (e) {
      toast.error(translateServerError(e instanceof Error ? e.message : t('common.saveFailed'), lang))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />{t('cp.title')}
          </DialogTitle>
          <DialogDescription>{t('cp.desc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>{t('cp.current')}</Label>
            <Input
              type="password" autoComplete="current-password"
              value={form.current}
              onChange={(e) => setForm((p) => ({ ...p, current: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('cp.new')}</Label>
            <Input
              type="password" autoComplete="new-password"
              value={form.next}
              onChange={(e) => setForm((p) => ({ ...p, next: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('cp.confirm')}</Label>
            <Input
              type="password" autoComplete="new-password"
              value={form.confirm}
              onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button onClick={submit} disabled={saving}>{saving ? t('common.saving') : t('common.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

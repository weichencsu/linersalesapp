'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import type { Customer } from '@/lib/types'
import { getRegionByCountry, REGIONS, type Region } from '@/lib/regions'
import { useI18n, translateServerError } from '@/lib/i18n'

// 常用矿业国家建议列表（按区域分组展示于 datalist）
const COUNTRY_SUGGESTIONS = [
  'China', 'Mongolia', 'Australia', 'Papua New Guinea', 'Indonesia', 'Philippines', 'Vietnam',
  'Laos', 'Myanmar', 'Thailand', 'Malaysia', 'Cambodia',
  'Kazakhstan', 'Uzbekistan', 'Kyrgyzstan', 'Tajikistan', 'Turkmenistan', 'Serbia', 'Greece',
  'DR Congo', 'Zambia', 'South Africa', 'Ghana', 'Tanzania', 'Guinea', 'Mali', 'Burkina Faso',
  "Côte d'Ivoire", 'Namibia', 'Zimbabwe', 'Botswana', 'Eritrea', 'Angola', 'Nigeria',
  'Peru', 'Chile', 'Brazil', 'Argentina', 'Colombia', 'Ecuador', 'Bolivia', 'Mexico',
  'Suriname', 'Guyana', 'Panama', 'Costa Rica',
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: Customer | null // null = 新增
  existingOwners: string[]
  onSaved: () => void
}

export default function CustomerDialog({ open, onOpenChange, customer, existingOwners, onSaved }: Props) {
  const { t, lang, regionLabel } = useI18n()
  const [form, setForm] = useState({
    owner: '', site: '', country: '', region: '', status: 'Potential Customer',
    reviewed: 'NO', latitude: '', longitude: '', notes: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({
        owner: customer?.owner ?? '',
        site: customer?.site ?? '',
        country: customer?.country ?? '',
        region: customer?.region ?? '',
        status: customer?.status === 'Current Customer' ? 'Existing Customer' : (customer?.status ?? 'Potential Customer'),
        reviewed: customer?.reviewed ?? 'NO',
        latitude: customer?.latitude !== null && customer?.latitude !== undefined ? String(customer.latitude) : '',
        longitude: customer?.longitude !== null && customer?.longitude !== undefined ? String(customer.longitude) : '',
        notes: customer?.notes ?? '',
      })
    }
  }, [open, customer])

  const autoRegion = useMemo(() => getRegionByCountry(form.country), [form.country])
  const set = (patch: Partial<typeof form>) => setForm((p) => ({ ...p, ...patch }))

  const submit = async () => {
    if (!form.owner.trim()) return toast.error(t('cd.ownerRequired'))
    if (!form.country.trim()) return toast.error(t('cd.countryRequired'))
    const lat = form.latitude === '' ? null : parseFloat(form.latitude)
    const lng = form.longitude === '' ? null : parseFloat(form.longitude)
    if (lat !== null && (isNaN(lat) || lat < -90 || lat > 90)) return toast.error(t('cd.latRange'))
    if (lng !== null && (isNaN(lng) || lng < -180 || lng > 180)) return toast.error(t('cd.lngRange'))

    setSaving(true)
    try {
      const payload = {
        owner: form.owner.trim(),
        site: form.site.trim(),
        country: form.country.trim(),
        region: form.region,
        status: form.status,
        reviewed: form.reviewed,
        latitude: lat,
        longitude: lng,
        notes: form.notes,
      }
      const res = await fetch(customer ? `/api/customers/${customer.id}` : '/api/customers', {
        method: customer ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('common.saveFailed'))
      toast.success(customer ? t('cd.updated') : t('cd.created', {
        owner: data.owner,
        site: data.site ? ' · ' + data.site : '',
      }))
      onOpenChange(false)
      onSaved()
    } catch (e) {
      toast.error(translateServerError(e instanceof Error ? e.message : t('common.saveFailed'), lang))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{customer ? t('cd.editTitle') : t('cd.addTitle')}</DialogTitle>
          <DialogDescription>
            {t('cd.desc')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3.5 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('cd.ownerLabel')}</Label>
              <Input list="owner-list" value={form.owner} onChange={(e) => set({ owner: e.target.value })} placeholder={t('cd.ownerPh')} />
              <datalist id="owner-list">
                {existingOwners.map((o) => <option key={o} value={o} />)}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label>{t('cd.siteLabel')}</Label>
              <Input value={form.site} onChange={(e) => set({ site: e.target.value })} placeholder={t('cd.sitePh')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('cd.countryLabel')}</Label>
              <Input list="country-list" value={form.country} onChange={(e) => set({ country: e.target.value })} placeholder={t('cd.countryPh')} />
              <datalist id="country-list">
                {COUNTRY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
              </datalist>
              {autoRegion && form.region !== autoRegion && (
                <p className="text-[11px] text-muted-foreground">
                  {t('cd.autoRegionNote', { r: regionLabel(autoRegion as Region) })}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{t('cd.regionLabel')}</Label>
              <Select value={form.region} onValueChange={(v) => set({ region: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('cd.autoAssign')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUTO">{t('cd.autoByCountry')}</SelectItem>
                  {REGIONS.map((r) => (
                    <SelectItem key={r} value={r}>{regionLabel(r)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('cd.statusLabel')}</Label>
              <Select value={form.status} onValueChange={(v) => set({ status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Existing Customer">{t('cd.currentOption')}</SelectItem>
                  <SelectItem value="Potential Customer">{t('cd.potentialOption')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('cd.reviewedLabel')}</Label>
              <Select value={form.reviewed} onValueChange={(v) => set({ reviewed: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="YES">YES</SelectItem>
                  <SelectItem value="NO">NO</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('cd.latLabel')}</Label>
              <Input type="number" step="any" value={form.latitude} onChange={(e) => set({ latitude: e.target.value })} placeholder="-90 ~ 90" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('cd.lngLabel')}</Label>
              <Input type="number" step="any" value={form.longitude} onChange={(e) => set({ longitude: e.target.value })} placeholder="-180 ~ 180" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t('cd.notesLabel')}</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder={t('cd.notesPh')} />
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

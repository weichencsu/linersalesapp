'use client'

import { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { Customer, Mill } from '@/lib/types'
import { useI18n, translateServerError, type I18nKey } from '@/lib/i18n'
import { Calculator } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: Customer
  mill: Mill | null // null = 新增
  onSaved: () => void
}

// 模块级组件：文本字段（标签 key 走 i18n）
function TextField({
  labelKey, k, ph, form, set,
}: {
  labelKey: I18nKey
  k: string
  ph?: string
  form: Record<string, string>
  set: (patch: Record<string, string>) => void
}) {
  const { t } = useI18n()
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{t(labelKey)}</Label>
      <Input value={form[k]} onChange={(e) => set({ [k]: e.target.value })} placeholder={ph} />
    </div>
  )
}

export default function MillDialog({ open, onOpenChange, customer, mill, onSaved }: Props) {
  const { t, lang } = useI18n()
  const [form, setForm] = useState<Record<string, string>>({
    equipment: '', millNumber: '', diameterLabel: '', lengthLabel: '', millType: 'SAG',
    linerType: 'Complete Set', linerSize: 'Large', material: 'Chrome-Moly', supplier: '',
    linerMassPerSetKg: '', annualLinerConsumptionKg: '', sellPricePerKgUsd: '',
    setPriceUsd: '', annualValueUsd: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      const src = mill ?? ({} as Partial<Mill>)
      setForm({
        equipment: src.equipment ?? '',
        millNumber: src.millNumber ?? '',
        diameterLabel: src.diameterLabel ?? '',
        lengthLabel: src.lengthLabel ?? '',
        millType: src.millType ?? 'SAG',
        linerType: src.linerType ?? 'Complete Set',
        linerSize: src.linerSize ?? 'Large',
        material: src.material ?? 'Chrome-Moly',
        supplier: src.supplier ?? '',
        linerMassPerSetKg: src.linerMassPerSetKg != null ? String(src.linerMassPerSetKg) : '',
        annualLinerConsumptionKg: src.annualLinerConsumptionKg != null ? String(src.annualLinerConsumptionKg) : '',
        sellPricePerKgUsd: src.sellPricePerKgUsd != null ? String(src.sellPricePerKgUsd) : '',
        setPriceUsd: src.setPriceUsd != null ? String(src.setPriceUsd) : '',
        annualValueUsd: src.annualValueUsd != null ? String(src.annualValueUsd) : '',
      })
    }
  }, [open, mill])

  const set = (patch: Record<string, string>) => setForm((p) => ({ ...p, ...patch }))

  // 自动计算：套价 = 单套重量 × 单价；年销售额 = 年消耗量 × 单价
  const autoCalc = () => {
    const mass = parseFloat(form.linerMassPerSetKg)
    const consumption = parseFloat(form.annualLinerConsumptionKg)
    const price = parseFloat(form.sellPricePerKgUsd)
    const patch: Record<string, string> = {}
    if (!isNaN(mass) && !isNaN(price)) patch.setPriceUsd = String(Math.round(mass * price))
    if (!isNaN(consumption) && !isNaN(price)) patch.annualValueUsd = String(Math.round(consumption * price))
    if (Object.keys(patch).length === 0) return toast.error(t('md.autoCalcNeed'))
    set(patch)
    toast.success(t('md.autoCalcDone'))
  }

  const submit = async () => {
    if (!form.millType.trim()) return toast.error(t('md.typeRequired'))
    const numeric: Record<string, number | null> = {}
    for (const k of ['linerMassPerSetKg', 'annualLinerConsumptionKg', 'sellPricePerKgUsd', 'setPriceUsd', 'annualValueUsd']) {
      numeric[k] = form[k] === '' ? null : parseFloat(form[k])
      if (numeric[k] !== null && isNaN(numeric[k] as number)) return toast.error(t('md.badNumber'))
    }
    setSaving(true)
    try {
      const res = await fetch(mill ? `/api/mills/${mill.id}` : '/api/mills', {
        method: mill ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(mill ? {} : { customerId: customer.id }),
          equipment: form.equipment,
          millNumber: form.millNumber,
          diameterLabel: form.diameterLabel,
          lengthLabel: form.lengthLabel,
          millType: form.millType,
          linerType: form.linerType,
          linerSize: form.linerSize,
          material: form.material,
          supplier: form.supplier,
          ...numeric,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('common.saveFailed'))
      toast.success(mill ? t('md.updated') : t('md.created'))
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mill ? t('md.editTitle') : t('md.addTitle')}</DialogTitle>
          <DialogDescription>
            {t('md.customer', {
              owner: customer.owner,
              site: customer.site ? ` · ${customer.site}` : '',
              country: customer.country,
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-1 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">{t('md.equipment')}</Label>
            <Input value={form.equipment} onChange={(e) => set({ equipment: e.target.value })} placeholder={t('md.equipmentPh')} />
          </div>
          <TextField labelKey="md.millNumber" k="millNumber" ph="SAG 1" form={form} set={set} />
          <TextField labelKey="md.diameter" k="diameterLabel" ph="30'" form={form} set={set} />
          <TextField labelKey="md.length" k="lengthLabel" ph="16.5'" form={form} set={set} />
          <TextField labelKey="md.millType" k="millType" ph="SAG / Ball / Vertical" form={form} set={set} />
          <TextField labelKey="md.linerType" k="linerType" ph="Complete Set" form={form} set={set} />
          <TextField labelKey="md.linerSize" k="linerSize" ph="Large" form={form} set={set} />
          <TextField labelKey="md.material" k="material" ph="Chrome-Moly" form={form} set={set} />
          <TextField labelKey="md.supplier" k="supplier" ph="Metso" form={form} set={set} />
        </div>
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{t('md.salesSection')}</span>
            <Button type="button" size="sm" variant="outline" onClick={autoCalc}>
              <Calculator className="mr-1 h-3.5 w-3.5" />{t('md.autoCalc')}
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-5">
            {([
              { labelKey: 'md.massPerSet', key: 'linerMassPerSetKg' },
              { labelKey: 'md.annualConsumption', key: 'annualLinerConsumptionKg' },
              { labelKey: 'md.pricePerKg', key: 'sellPricePerKgUsd' },
              { labelKey: 'md.setPrice', key: 'setPriceUsd' },
              { labelKey: 'md.annualValue', key: 'annualValueUsd' },
            ] as { labelKey: I18nKey; key: string }[]).map(({ labelKey, key }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs">{t(labelKey)}</Label>
                <Input
                  type="number" step="any" min="0" value={form[key]}
                  onChange={(e) => set({ [key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {t('md.calcRule')}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button onClick={submit} disabled={saving}>{saving ? t('common.saving') : t('common.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

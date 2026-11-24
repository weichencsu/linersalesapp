'use client'

import { Fragment, useMemo, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { toast } from 'sonner'
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronRight, Upload,
  FileSpreadsheet, Factory, MapPin,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import type { Customer, Mill } from '@/lib/types'
import { REGION_META, type Region } from '@/lib/regions'
import { fmtMoney, statusBadgeClass } from '@/lib/format'
import { useI18n, translateServerError } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import CustomerDialog from './CustomerDialog'
import MillDialog from './MillDialog'

interface Props {
  customers: Customer[]
  reload: () => void
}

// 客户管理（仅管理员可见；会话 Cookie 鉴权）
export default function ManageTab({ customers, reload }: Props) {
  const { t, lang, regionShort, statusLabel } = useI18n()
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [customerDialog, setCustomerDialog] = useState<{ open: boolean; customer: Customer | null }>({ open: false, customer: null })
  const [millDialog, setMillDialog] = useState<{ open: boolean; customer: Customer | null; mill: Mill | null }>({ open: false, customer: null, mill: null })
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'customer' | 'mill'; customer: Customer; mill?: Mill } | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importMode, setImportMode] = useState('append')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<Record<string, number | string> | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const owners = useMemo(() => [...new Set(customers.map((c) => c.owner))].sort(), [customers])
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c) => `${c.owner} ${c.site} ${c.country}`.toLowerCase().includes(q))
  }, [customers, search])

  // ---- 删除 ----
  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      const url = deleteTarget.type === 'customer'
        ? `/api/customers/${deleteTarget.customer.id}`
        : `/api/mills/${deleteTarget.mill!.id}`
      const res = await fetch(url, { method: 'DELETE' })
      if (res.status === 401) { window.location.href = '/login'; return }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(deleteTarget.type === 'customer' ? t('mg.customerDeleted') : t('mg.millDeleted'))
      reload()
    } catch (e) {
      toast.error(translateServerError(e instanceof Error ? e.message : t('mg.deleteFailed'), lang))
    } finally {
      setDeleteTarget(null)
    }
  }

  // ---- Excel 导入 ----
  const doImport = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) return toast.error(t('mg.pickFile'))
    setImporting(true)
    setImportResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('mode', importMode)
      const res = await fetch('/api/import', { method: 'POST', body: fd })
      if (res.status === 401) { window.location.href = '/login'; return }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setImportResult(data)
      toast.success(t('mg.importDone'))
      reload()
    } catch (e) {
      toast.error(translateServerError(e instanceof Error ? e.message : t('mg.importFailed'), lang))
    } finally {
      setImporting(false)
    }
  }

  // ---- 导出全部（Excel 格式，可作为导入模板；表头保持英文与模板一致） ----
  const exportAll = () => {
    const cols = [
      'Status', 'Region', 'Country', 'Owner', 'Site', 'Equipment', 'Mill #', 'Diameter', 'Length',
      'Mill Type', 'Liner Type', 'Liner Size', 'Material', 'Supplier',
      "Liner Mass Per Set KG's", 'Annual Liner Consumption', 'Sell Price $/KG USD',
      'Set Price, $', 'Total Potential Annual Value', 'Latitude', 'Longitude',
    ]
    const rows = customers.flatMap((c) =>
      (c.mills.length ? c.mills : [null as unknown as Mill]).map((m) => [
        c.status, c.region, c.country, c.owner, c.site, m?.equipment ?? '', m?.millNumber ?? '',
        m?.diameterLabel ?? '', m?.lengthLabel ?? '', m?.millType ?? '', m?.linerType ?? '',
        m?.linerSize ?? '', m?.material ?? '', m?.supplier ?? '',
        m?.linerMassPerSetKg ?? '', m?.annualLinerConsumptionKg ?? '', m?.sellPricePerKgUsd ?? '',
        m?.setPriceUsd ?? '', m?.annualValueUsd ?? '', c.latitude ?? '', c.longitude ?? '',
      ])
    )
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([cols, ...rows])
    ws['!cols'] = cols.map((c) => ({ wch: Math.max(14, c.length + 2) }))
    XLSX.utils.book_append_sheet(wb, ws, 'Data Entry')
    XLSX.writeFile(wb, `Mill_Liners_All_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // ===== 管理界面 =====
  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          <Button onClick={() => setCustomerDialog({ open: true, customer: null })}>
            <Plus className="mr-1 h-4 w-4" />{t('mg.addCustomer')}
          </Button>
          <Button variant="outline" onClick={() => { setImportOpen(true); setImportResult(null) }}>
            <Upload className="mr-1 h-4 w-4" />{t('mg.importExcel')}
          </Button>
          <Button variant="outline" onClick={exportAll}>
            <FileSpreadsheet className="mr-1 h-4 w-4" />{t('mg.exportAll')}
          </Button>
        </CardContent>
      </Card>

      {/* 客户列表 */}
      <Card className="overflow-hidden">
        <div className="border-b p-3">
          <Input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t('filter.searchOwnerSiteCountry')} className="max-w-sm"
          />
        </div>
        <div className="max-h-[640px] overflow-auto [scrollbar-width:thin]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>{t('mg.col.ownerSite')}</TableHead>
                <TableHead>{t('mg.col.countryRegion')}</TableHead>
                <TableHead>{t('dash.col.status')}</TableHead>
                <TableHead className="text-center">{t('mg.col.mills')}</TableHead>
                <TableHead className="text-right">{t('mg.col.annual')}</TableHead>
                <TableHead>{t('mg.col.coords')}</TableHead>
                <TableHead className="w-28">{t('mg.col.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => {
                const open = expanded.has(c.id)
                const value = c.mills.reduce((s, m) => s + (m.annualValueUsd ?? 0), 0)
                const meta = REGION_META[c.region as Region] ?? REGION_META.OTHER
                return (
                  <Fragment key={c.id}>
                    <TableRow>
                      <TableCell>
                        <button
                          onClick={() =>
                            setExpanded((prev) => {
                              const next = new Set(prev)
                              if (next.has(c.id)) next.delete(c.id)
                              else next.add(c.id)
                              return next
                            })
                          }
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{c.owner}</div>
                        <div className="text-xs text-muted-foreground">{c.site || '—'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{c.country}</div>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
                          {regionShort(c.region)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('whitespace-nowrap', statusBadgeClass(c.status))}>
                          {statusLabel(c.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center tabular-nums">{c.mills.length}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{fmtMoney(value)}</TableCell>
                      <TableCell>
                        <span className={cn('inline-flex items-center gap-1 text-xs tabular-nums',
                          c.latitude === null ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>
                          <MapPin className="h-3 w-3" />
                          {c.latitude === null || c.longitude === null
                            ? t('common.notSet')
                            : `${c.latitude.toFixed(3)}, ${c.longitude.toFixed(3)}`}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-0.5">
                          <Button size="icon" variant="ghost" className="h-7 w-7" title={t('mg.editCustomer')}
                            onClick={() => setCustomerDialog({ open: true, customer: c })}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" title={t('mg.deleteCustomer')}
                            onClick={() => setDeleteTarget({ type: 'customer', customer: c })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {open && (
                      <TableRow key={`x-${c.id}`} className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={8} className="px-4 py-3">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">
                              {t('mg.millDetails', { n: c.mills.length })}
                              {c.notes && <span className="ml-2 font-normal">{t('mg.notesLabel', { n: c.notes })}</span>}
                            </span>
                            <Button size="sm" variant="outline" onClick={() => setMillDialog({ open: true, customer: c, mill: null })}>
                              <Plus className="mr-1 h-3.5 w-3.5" />{t('mg.addMill')}
                            </Button>
                          </div>
                          {c.mills.length === 0 ? (
                            <div className="py-4 text-center text-xs text-muted-foreground">
                              {t('mg.noMills')}
                            </div>
                          ) : (
                            <div className="overflow-hidden rounded-md border bg-background">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>{t('dash.col.equipment')}</TableHead>
                                    <TableHead>{t('dash.col.diameter')}</TableHead>
                                    <TableHead>{t('dash.col.type')}</TableHead>
                                    <TableHead>{t('dash.col.supplier')}</TableHead>
                                    <TableHead className="text-right">{t('mg.col.setPrice')}</TableHead>
                                    <TableHead className="text-right">{t('mg.col.annualValue')}</TableHead>
                                    <TableHead className="w-20">{t('mg.col.actions')}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {c.mills.map((m) => (
                                    <TableRow key={m.id}>
                                      <TableCell className="text-xs">
                                        {m.equipment || m.millType}
                                        {m.millNumber && <span className="ml-1 text-muted-foreground">({m.millNumber})</span>}
                                      </TableCell>
                                      <TableCell className="text-xs">{m.diameterLabel ?? '—'}</TableCell>
                                      <TableCell><Badge variant="secondary" className="font-mono text-[10px]">{m.millType ?? '—'}</Badge></TableCell>
                                      <TableCell className="text-xs">{m.supplier ?? '—'}</TableCell>
                                      <TableCell className="text-right text-xs tabular-nums">{fmtMoney(m.setPriceUsd)}</TableCell>
                                      <TableCell className="text-right text-xs tabular-nums">{fmtMoney(m.annualValueUsd)}</TableCell>
                                      <TableCell>
                                        <div className="flex gap-0.5">
                                          <Button size="icon" variant="ghost" className="h-6 w-6" title={t('mg.editMill')}
                                            onClick={() => setMillDialog({ open: true, customer: c, mill: m })}>
                                            <Pencil className="h-3 w-3" />
                                          </Button>
                                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" title={t('mg.deleteMill')}
                                            onClick={() => setDeleteTarget({ type: 'mill', customer: c, mill: m })}>
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-16 text-center text-sm text-muted-foreground">
                    {t('mg.noMatch')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* 客户对话框 */}
      <CustomerDialog
        open={customerDialog.open}
        onOpenChange={(o) => setCustomerDialog((s) => ({ ...s, open: o }))}
        customer={customerDialog.customer}
        existingOwners={owners}
        onSaved={reload}
      />

      {/* 磨机对话框 */}
      {millDialog.customer && (
        <MillDialog
          open={millDialog.open}
          onOpenChange={(o) => setMillDialog((s) => ({ ...s, open: o }))}
          customer={millDialog.customer}
          mill={millDialog.mill}
          onSaved={reload}
        />
      )}

      {/* 删除确认 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('mg.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'customer' ? (
                <>
                  {t('mg.deleteCustomerMsg', {
                    owner: deleteTarget.customer.owner,
                    site: deleteTarget.customer.site || '—',
                    n: deleteTarget.customer.mills.length,
                  })}
                </>
              ) : (
                <>
                  {t('mg.deleteMillMsg', {
                    equipment: deleteTarget?.mill?.equipment || deleteTarget?.mill?.millType || '—',
                    num: deleteTarget?.mill?.millNumber ? ` (${deleteTarget.mill.millNumber})` : '',
                  })}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Excel 导入 */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('mg.importTitle')}</DialogTitle>
            <DialogDescription>
              {t('mg.importDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <input
              ref={fileRef} type="file" accept=".xlsx,.xls"
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
            />
            <RadioGroup value={importMode} onValueChange={setImportMode} className="gap-2">
              <div className="flex items-start gap-2.5 rounded-lg border p-3">
                <RadioGroupItem value="append" id="m-append" className="mt-0.5" />
                <Label htmlFor="m-append" className="cursor-pointer font-normal">
                  <span className="font-medium">{t('mg.importAppend')}</span>
                  <span className="block text-xs text-muted-foreground">
                    {t('mg.importAppendDesc')}
                  </span>
                </Label>
              </div>
              <div className="flex items-start gap-2.5 rounded-lg border p-3">
                <RadioGroupItem value="replace" id="m-replace" className="mt-0.5" />
                <Label htmlFor="m-replace" className="cursor-pointer font-normal">
                  <span className="font-medium">{t('mg.importReplace')}</span>
                  <span className="block text-xs text-muted-foreground">
                    {t('mg.importReplaceDesc')}
                  </span>
                </Label>
              </div>
            </RadioGroup>
            {importResult && (
              <div className="rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed">
                <div className="font-medium">{t('mg.importResult', { s: String(importResult.sheetName) })}</div>
                <div>{t('mg.importRows', { n: importResult.totalRows })}</div>
                <div>{t('mg.importCustomers', { c: importResult.createdCustomers, u: importResult.updatedCustomers })}</div>
                <div>{t('mg.importMills', { c: importResult.createdMills, s: importResult.skippedMills })}</div>
                <div>{t('mg.importRegions', { n: importResult.regionFixed })}</div>
                {Number(importResult.coordsFixed) > 0 && (
                  <div className="text-amber-600 dark:text-amber-400">
                    {t('mg.importCoords', { n: importResult.coordsFixed })}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>{t('common.close')}</Button>
            <Button onClick={doImport} disabled={importing}>
              <Upload className="mr-1 h-4 w-4" />
              {importing ? t('mg.importing') : t('mg.startImport')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

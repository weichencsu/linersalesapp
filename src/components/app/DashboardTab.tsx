'use client'

import { Fragment, useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Building2, ChevronDown, ChevronRight, Download, FileSpreadsheet,
  MapPin, RotateCcw, Search, Users, Factory, Globe2, DollarSign,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import type { Customer, Mill } from '@/lib/types'
import { REGION_META, REGIONS, diameterBucket, type Region } from '@/lib/regions'
import { fmtMoney, fmtPrice, statusBadgeClass } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export interface DashboardFilters {
  region: string
  country: string
  owner: string
  millType: string
  diameter: string
  supplier: string
  status: string
  search: string
}

interface Props {
  customers: Customer[]
  onViewOnMap: (customerId: number) => void
}

type SortKey = 'owner' | 'country' | 'diameterFt' | 'setPriceUsd' | 'annualValueUsd'

// 模块级组件：可排序表头
function SortHead({
  k, sortKey, sortDir, onSort, children, className,
}: {
  k: SortKey
  sortKey: SortKey
  sortDir: 'asc' | 'desc'
  onSort: (k: SortKey) => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <TableHead className={className}>
      <button onClick={() => onSort(k)} className="inline-flex items-center gap-1 hover:text-foreground">
        {children}
        <ChevronDown
          className={cn(
            'h-3 w-3 transition-transform',
            sortKey === k ? (sortDir === 'asc' && 'rotate-180') : 'opacity-30'
          )}
        />
      </button>
    </TableHead>
  )
}

export default function DashboardTab({ customers, onViewOnMap }: Props) {
  const { t, regionShort, statusLabel } = useI18n()
  const [f, setF] = useState<DashboardFilters>({
    region: 'ALL', country: 'ALL', owner: 'ALL', millType: 'ALL',
    diameter: 'ALL', supplier: 'ALL', status: 'ALL', search: '',
  })
  const [view, setView] = useState<'customer' | 'mill'>('customer')
  const [sortKey, setSortKey] = useState<SortKey>('annualValueUsd')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const set = (patch: Partial<DashboardFilters>) => setF((prev) => ({ ...prev, ...patch }))

  // ---- 级联选项 ----
  const regionCustomers = useMemo(
    () => customers.filter((c) => f.region === 'ALL' || c.region === f.region),
    [customers, f.region]
  )
  const countries = useMemo(
    () => [...new Set(regionCustomers.map((c) => c.country))].sort(),
    [regionCustomers]
  )
  const rcCustomers = useMemo(
    () => regionCustomers.filter((c) => f.country === 'ALL' || c.country === f.country),
    [regionCustomers, f.country]
  )
  const owners = useMemo(() => [...new Set(rcCustomers.map((c) => c.owner))].sort(), [rcCustomers])
  const suppliers = useMemo(() => {
    const set = new Set<string>()
    for (const c of customers) for (const m of c.mills) if (m.supplier) set.add(m.supplier)
    return [...set].sort()
  }, [customers])
  const millTypes = useMemo(() => {
    const set = new Set<string>()
    for (const c of customers) for (const m of c.mills) if (m.millType) set.add(m.millType)
    return [...set].sort()
  }, [customers])

  // ---- 筛选逻辑（磨机级）----
  const rows = useMemo(() => {
    const millMatch = (m: Mill) => {
      if (f.millType !== 'ALL' && m.millType !== f.millType) return false
      if (f.supplier !== 'ALL' && m.supplier !== f.supplier) return false
      if (f.diameter !== 'ALL') {
        if (f.diameter === 'unknown') {
          if (m.diameterFt !== null) return false
        } else if (diameterBucket(m.diameterFt) !== f.diameter) return false
      }
      return true
    }
    const custMatch = (c: Customer) => {
      if (f.region !== 'ALL' && c.region !== f.region) return false
      if (f.country !== 'ALL' && c.country !== f.country) return false
      if (f.owner !== 'ALL' && c.owner !== f.owner) return false
      if (f.status !== 'ALL') {
        const s = c.status?.toLowerCase()
        const isExisting = s === 'existing customer' || s === 'current customer'
        if (f.status === 'Existing Customer' && !isExisting) return false
        if (f.status === 'Potential Customer' && s !== 'potential customer') return false
      }
      const q = f.search.trim().toLowerCase()
      if (q && !`${c.owner} ${c.site} ${c.country}`.toLowerCase().includes(q)) return false
      return true
    }
    // 符合条件的磨机行（带客户）
    const result: { customer: Customer; mill: Mill }[] = []
    for (const c of customers) {
      if (!custMatch(c)) continue
      for (const m of c.mills) {
        if (millMatch(m)) result.push({ customer: c, mill: m })
      }
    }
    return result
  }, [customers, f])

  const millFilterActive = f.millType !== 'ALL' || f.supplier !== 'ALL' || f.diameter !== 'ALL'

  // 客户汇总视图：未启用磨机级筛选时，包含无磨机数据的客户
  const customerRows = useMemo(() => {
    const map = new Map<number, { customer: Customer; mills: Mill[] }>()
    if (millFilterActive) {
      for (const { customer, mill } of rows) {
        if (!map.has(customer.id)) map.set(customer.id, { customer, mills: [] })
        map.get(customer.id)!.mills.push(mill)
      }
    } else {
      const q = f.search.trim().toLowerCase()
      for (const c of customers) {
        if (f.region !== 'ALL' && c.region !== f.region) continue
        if (f.country !== 'ALL' && c.country !== f.country) continue
        if (f.owner !== 'ALL' && c.owner !== f.owner) continue
        if (f.status !== 'ALL') {
          const s = c.status?.toLowerCase()
          const isExisting = s === 'existing customer' || s === 'current customer'
          if (f.status === 'Existing Customer' && !isExisting) continue
          if (f.status === 'Potential Customer' && s !== 'potential customer') continue
        }
        if (q && !`${c.owner} ${c.site} ${c.country}`.toLowerCase().includes(q)) continue
        map.set(c.id, { customer: c, mills: c.mills })
      }
    }
    const list = [...map.values()]
    const dir = sortDir === 'asc' ? 1 : -1
    return list.sort((a, b) => {
      if (sortKey === 'owner') return a.customer.owner.localeCompare(b.customer.owner) * dir
      const av = a.mills.reduce((s, m) => s + (m.annualValueUsd ?? 0), 0)
      const bv = b.mills.reduce((s, m) => s + (m.annualValueUsd ?? 0), 0)
      return (av - bv) * dir
    })
  }, [rows, customers, f, millFilterActive, sortKey, sortDir])

  // ---- 排序（磨机明细视图）----
  const sortedRows = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      switch (sortKey) {
        case 'owner': return a.customer.owner.localeCompare(b.customer.owner) * dir
        case 'country': return a.customer.country.localeCompare(b.customer.country) * dir
        case 'diameterFt': return ((a.mill.diameterFt ?? -1) - (b.mill.diameterFt ?? -1)) * dir
        case 'setPriceUsd': return ((a.mill.setPriceUsd ?? -1) - (b.mill.setPriceUsd ?? -1)) * dir
        default: return ((a.mill.annualValueUsd ?? -1) - (b.mill.annualValueUsd ?? -1)) * dir
      }
    })
  }, [rows, sortKey, sortDir])

  // ---- KPI ----
  const kpi = useMemo(() => {
    const annual = rows.reduce((s, r) => s + (r.mill.annualValueUsd ?? 0), 0)
    const setP = rows.reduce((s, r) => s + (r.mill.setPriceUsd ?? 0), 0)
    const countries = new Set(customerRows.map((r) => r.customer.country))
    const regions = new Set(customerRows.map((r) => r.customer.region))
    const current = customerRows.filter((r) => {
      const s = r.customer.status?.toLowerCase()
      return s === 'existing customer' || s === 'current customer'
    }).length
    const sag = rows.filter((r) => r.mill.millType === 'SAG').length
    const ball = rows.filter((r) => r.mill.millType === 'Ball').length
    return {
      customers: customerRows.length, mills: rows.length, annual, setP,
      countries: countries.size, regions: regions.size, current,
      potential: customerRows.length - current, sag, ball,
    }
  }, [rows, customerRows])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir(key === 'owner' || key === 'country' ? 'asc' : 'desc')
    }
  }

  const reset = () =>
    setF({ region: 'ALL', country: 'ALL', owner: 'ALL', millType: 'ALL', diameter: 'ALL', supplier: 'ALL', status: 'ALL', search: '' })

  const hasFilter =
    f.region !== 'ALL' || f.country !== 'ALL' || f.owner !== 'ALL' || f.millType !== 'ALL' ||
    f.diameter !== 'ALL' || f.supplier !== 'ALL' || f.status !== 'ALL' || f.search !== ''

  // ---- 导出（表头保持 Excel 模板英文格式，保证导入/导出往返一致）----
  const exportColumns = [
    'Status', 'Region', 'Country', 'Owner', 'Site', 'Equipment', 'Mill #', 'Diameter', 'Length',
    'Mill Type', 'Liner Type', 'Liner Size', 'Material', 'Supplier',
    "Liner Mass Per Set KG's", 'Annual Liner Consumption', 'Sell Price $/KG USD',
    'Set Price, $', 'Total Potential Annual Value', 'Latitude', 'Longitude',
  ]
  const exportRows = sortedRows.map(({ customer: c, mill: m }) => [
    c.status, c.region, c.country, c.owner, c.site, m.equipment, m.millNumber ?? '',
    m.diameterLabel ?? '', m.lengthLabel ?? '', m.millType ?? '', m.linerType ?? '',
    m.linerSize ?? '', m.material ?? '', m.supplier ?? '',
    m.linerMassPerSetKg ?? '', m.annualLinerConsumptionKg ?? '', m.sellPricePerKgUsd ?? '',
    m.setPriceUsd ?? '', m.annualValueUsd ?? '', c.latitude ?? '', c.longitude ?? '',
  ])

  const doExportXlsx = () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([exportColumns, ...exportRows])
    ws['!cols'] = exportColumns.map((col) => ({ wch: Math.max(12, col.length + 2) }))
    XLSX.utils.book_append_sheet(wb, ws, 'Data Entry')
    // 汇总 sheet
    const sumCols = ['Owner', 'Site', 'Country', 'Region', 'Status', 'Mill Count', 'Total Set Price $', 'Total Annual Value $']
    const sumData = customerRows.map(({ customer: c, mills }) => [
      c.owner, c.site, c.country, c.region, c.status, mills.length,
      mills.reduce((s, m) => s + (m.setPriceUsd ?? 0), 0),
      mills.reduce((s, m) => s + (m.annualValueUsd ?? 0), 0),
    ])
    const ws2 = XLSX.utils.aoa_to_sheet([sumCols, ...sumData])
    ws2['!cols'] = sumCols.map((col) => ({ wch: Math.max(12, col.length + 2) }))
    XLSX.utils.book_append_sheet(wb, ws2, 'By Customer')
    XLSX.writeFile(wb, `Mill_Liners_Export_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const doExportCsv = () => {
    const esc = (v: unknown) => {
      const s = String(v ?? '')
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const csv = [exportColumns, ...exportRows].map((r) => r.map(esc).join(',')).join('\r\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Mill_Liners_Export_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalsAnnual = rows.reduce((s, r) => s + (r.mill.annualValueUsd ?? 0), 0)
  const totalsSet = rows.reduce((s, r) => s + (r.mill.setPriceUsd ?? 0), 0)

  return (
    <div className="space-y-4">
      {/* ===== KPI ===== */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-2 p-3 sm:gap-3 sm:p-4">
            <div className="shrink-0 rounded-lg bg-emerald-100 p-2 sm:p-2.5 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="text-lg sm:text-2xl font-bold tabular-nums">{kpi.customers}</div>
              <div className="text-xs text-muted-foreground">{t('dash.customers')}</div>
              <div className="text-[11px] text-muted-foreground">
                {t('dash.currentPotential', { c: kpi.current, p: kpi.potential })}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-2 p-3 sm:gap-3 sm:p-4">
            <div className="shrink-0 rounded-lg bg-amber-100 p-2 sm:p-2.5 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <Factory className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="text-lg sm:text-2xl font-bold tabular-nums">{kpi.mills}</div>
              <div className="text-xs text-muted-foreground">{t('dash.mills')}</div>
              <div className="text-[11px] text-muted-foreground">SAG {kpi.sag} · Ball {kpi.ball}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-2 p-3 sm:gap-3 sm:p-4">
            <div className="shrink-0 rounded-lg bg-rose-100 p-2 sm:p-2.5 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
              <Globe2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="text-lg sm:text-2xl font-bold tabular-nums">{kpi.countries}</div>
              <div className="text-xs text-muted-foreground">{t('dash.countries')}</div>
              <div className="text-[11px] text-muted-foreground">{t('dash.nRegions', { n: kpi.regions })}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-2 p-3 sm:gap-3 sm:p-4">
            <div className="shrink-0 rounded-lg bg-teal-100 p-2 sm:p-2.5 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-default text-lg sm:text-2xl font-bold tabular-nums">
                      {fmtMoney(kpi.annual)}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div>{t('dash.annualTip', { v: fmtMoney(kpi.annual, { precise: true }) })}</div>
                    <div>{t('dash.setTip', { v: fmtMoney(kpi.setP, { precise: true }) })}</div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="text-xs text-muted-foreground">{t('dash.annualTotal')}</div>
              <div className="text-[11px] text-muted-foreground">{t('dash.setShort', { v: fmtMoney(kpi.setP) })}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== 筛选 ===== */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-8">
            <Select value={f.region} onValueChange={(v) => set({ region: v, country: 'ALL', owner: 'ALL' })}>
              <SelectTrigger><SelectValue placeholder={t('filter.region')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('filter.allRegions')}</SelectItem>
                {REGIONS.map((r) => (
                  <SelectItem key={r} value={r}>{regionShort(r)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={f.country} onValueChange={(v) => set({ country: v, owner: 'ALL' })}>
              <SelectTrigger><SelectValue placeholder={t('filter.country')} /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="ALL">{t('filter.allCountries')}</SelectItem>
                {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={f.owner} onValueChange={(v) => set({ owner: v })}>
              <SelectTrigger><SelectValue placeholder={t('filter.owner')} /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="ALL">{t('filter.allOwners')}</SelectItem>
                {owners.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={f.millType} onValueChange={(v) => set({ millType: v })}>
              <SelectTrigger><SelectValue placeholder={t('filter.millType')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('filter.allMillTypes')}</SelectItem>
                {millTypes.map((mt) => <SelectItem key={mt} value={mt}>{mt}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={f.diameter} onValueChange={(v) => set({ diameter: v })}>
              <SelectTrigger><SelectValue placeholder={t('filter.millSize')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('filter.allMillSizes')}</SelectItem>
                <SelectItem value="≤ 22 ft">≤ 22 ft</SelectItem>
                <SelectItem value="23–28 ft">23–28 ft</SelectItem>
                <SelectItem value="29–32 ft">29–32 ft</SelectItem>
                <SelectItem value="33–36 ft">33–36 ft</SelectItem>
                <SelectItem value="≥ 38 ft">≥ 38 ft</SelectItem>
                <SelectItem value="unknown">{t('filter.unknownSize')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={f.supplier} onValueChange={(v) => set({ supplier: v })}>
              <SelectTrigger><SelectValue placeholder={t('filter.supplier')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('filter.allSuppliers')}</SelectItem>
                {suppliers.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={f.status} onValueChange={(v) => set({ status: v })}>
              <SelectTrigger><SelectValue placeholder={t('filter.status')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('filter.allStatuses')}</SelectItem>
                <SelectItem value="Existing Customer">{t('status.existing')}</SelectItem>
                <SelectItem value="Potential Customer">{t('status.potential')}</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={f.search}
                onChange={(e) => set({ search: e.target.value })}
                placeholder={t('filter.searchOwnerSite')}
                className="pl-8"
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={reset} disabled={!hasFilter}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" />{t('dash.reset')}
            </Button>
            <span className="text-xs text-muted-foreground">
              {hasFilter
                ? t('dash.filtered', { c: kpi.customers, m: kpi.mills })
                : t('dash.showAll')}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={doExportCsv}>
                <Download className="mr-1 h-3.5 w-3.5" />CSV
              </Button>
              <Button size="sm" onClick={doExportXlsx}>
                <FileSpreadsheet className="mr-1 h-3.5 w-3.5" />{t('dash.exportExcel')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== 视图切换 ===== */}
      <div className="flex items-center gap-2">
        <div className="inline-flex rounded-lg border bg-muted p-0.5">
          <button
            onClick={() => setView('customer')}
            className={cn('rounded-md px-3 py-1 text-sm font-medium transition-colors',
              view === 'customer' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}
          >
            <Building2 className="mr-1.5 inline h-3.5 w-3.5" />{t('dash.byCustomer')}
          </button>
          <button
            onClick={() => setView('mill')}
            className={cn('rounded-md px-3 py-1 text-sm font-medium transition-colors',
              view === 'mill' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}
          >
            <Factory className="mr-1.5 inline h-3.5 w-3.5" />{t('dash.byMill')}
          </button>
        </div>
        {view === 'customer' && (
          <span className="text-xs text-muted-foreground">{t('dash.expandHint')}</span>
        )}
      </div>

      {/* ===== 数据表 ===== */}
      <Card className="overflow-hidden">
        <div className="max-h-[620px] overflow-auto [scrollbar-width:thin]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              {view === 'customer' ? (
                <TableRow>
                  <TableHead className="w-8" />
                  <SortHead k="owner" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}>{t('dash.col.ownerSite')}</SortHead>
                  <SortHead k="country" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}>{t('dash.col.country')}</SortHead>
                  <TableHead>{t('dash.col.region')}</TableHead>
                  <TableHead className="text-center">{t('dash.col.mills')}</TableHead>
                  <TableHead>{t('dash.col.millTypes')}</TableHead>
                  <SortHead k="annualValueUsd" className="text-right" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}>{t('dash.col.annual')}</SortHead>
                  <TableHead>{t('dash.col.status')}</TableHead>
                  <TableHead className="w-20 text-center">{t('dash.col.map')}</TableHead>
                </TableRow>
              ) : (
                <TableRow>
                  <SortHead k="owner" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}>{t('dash.col.ownerSite')}</SortHead>
                  <TableHead>{t('dash.col.equipment')}</TableHead>
                  <SortHead k="diameterFt" className="text-center" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}>{t('dash.col.diameter')}</SortHead>
                  <TableHead className="text-center">{t('dash.col.length')}</TableHead>
                  <TableHead>{t('dash.col.type')}</TableHead>
                  <TableHead>{t('dash.col.supplier')}</TableHead>
                  <SortHead k="setPriceUsd" className="text-right" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}>{t('dash.col.setPrice')}</SortHead>
                  <SortHead k="annualValueUsd" className="text-right" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}>{t('dash.col.annual')}</SortHead>
                </TableRow>
              )}
            </TableHeader>
            <TableBody>
              {view === 'customer'
                ? customerRows.map(({ customer: c, mills }) => {
                    const open = expanded.has(c.id)
                    const value = mills.reduce((s, m) => s + (m.annualValueUsd ?? 0), 0)
                    const setValue = mills.reduce((s, m) => s + (m.setPriceUsd ?? 0), 0)
                    return (
                      <Fragment key={c.id}>
                        <TableRow className="cursor-pointer" onClick={() =>
                          setExpanded((prev) => {
                            const next = new Set(prev)
                            if (next.has(c.id)) next.delete(c.id)
                            else next.add(c.id)
                            return next
                          })
                        }>
                          <TableCell className="w-8">
                            {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{c.owner}</div>
                            <div className="text-xs text-muted-foreground">{c.site || '—'}</div>
                          </TableCell>
                          <TableCell>{c.country}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1.5 text-xs">
                              <span className="h-2 w-2 rounded-full" style={{ background: (REGION_META[c.region as Region] ?? REGION_META.OTHER).color }} />
                              {regionShort(c.region)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center tabular-nums">{mills.length}</TableCell>
                          <TableCell className="text-xs">
                            {[...new Set(mills.map((m) => m.millType).filter(Boolean))].join(' / ') || '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-semibold tabular-nums">{fmtMoney(value)}</div>
                            <div className="text-[11px] text-muted-foreground tabular-nums">{t('dash.setUnit', { v: fmtMoney(setValue) })}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('whitespace-nowrap', statusBadgeClass(c.status))}>
                              {statusLabel(c.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="icon" variant="ghost" className="h-7 w-7"
                              disabled={c.latitude === null || c.longitude === null}
                              onClick={(e) => { e.stopPropagation(); onViewOnMap(c.id) }}
                              title={t('dash.viewOnMap')}
                            >
                              <MapPin className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        {open && mills.map((m) => (
                          <TableRow key={`m-${m.id}`} className="bg-muted/30">
                            <TableCell />
                            <TableCell colSpan={4} className="py-2 text-xs">
                              <span className="font-medium">{m.equipment || m.millType}</span>
                              {m.millNumber && <span className="ml-1 text-muted-foreground">({m.millNumber})</span>}
                              <span className="ml-2 text-muted-foreground">
                                {m.diameterLabel ?? '?'} × {m.lengthLabel ?? '?'} · {m.millType}
                              </span>
                            </TableCell>
                            <TableCell className="py-2 text-xs">{m.supplier ?? '—'}</TableCell>
                            <TableCell className="py-2 text-right text-xs tabular-nums">{fmtMoney(m.setPriceUsd)}</TableCell>
                            <TableCell className="py-2 text-right text-xs font-medium tabular-nums">{fmtMoney(m.annualValueUsd)}</TableCell>
                            <TableCell colSpan={2} className="py-2 text-xs text-muted-foreground">
                              {fmtPrice(m.sellPricePerKgUsd)}/kg
                            </TableCell>
                          </TableRow>
                        ))}
                      </Fragment>
                    )
                  })
                : sortedRows.map(({ customer: c, mill: m }) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="font-medium">{c.owner}</div>
                        <div className="text-xs text-muted-foreground">{c.site || '—'} · {c.country}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {m.equipment || '—'}
                        {m.millNumber && <span className="ml-1 text-xs text-muted-foreground">({m.millNumber})</span>}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">{m.diameterLabel ?? '—'}</TableCell>
                      <TableCell className="text-center tabular-nums">{m.lengthLabel ?? '—'}</TableCell>
                      <TableCell><Badge variant="secondary" className="font-mono text-xs">{m.millType ?? '—'}</Badge></TableCell>
                      <TableCell className="text-sm">{m.supplier ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtMoney(m.setPriceUsd)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{fmtMoney(m.annualValueUsd)}</TableCell>
                    </TableRow>
                  ))}
              {/* 合计行 */}
              <TableRow className="sticky bottom-0 bg-muted/80 font-semibold backdrop-blur">
                {view === 'customer' ? (
                  <>
                    <TableCell />
                    <TableCell colSpan={5}>{t('dash.totalCustomers', { n: customerRows.length })}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMoney(totalsAnnual)}</TableCell>
                    <TableCell colSpan={2} />
                  </>
                ) : (
                  <>
                    <TableCell colSpan={6}>{t('dash.totalMills', { n: rows.length })}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMoney(totalsSet)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMoney(totalsAnnual)}</TableCell>
                  </>
                )}
              </TableRow>
            </TableBody>
          </Table>
          {rows.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              {t('dash.noData')}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

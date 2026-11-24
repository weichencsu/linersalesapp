'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { MapPin, Search, X, Globe2 } from 'lucide-react'
import type { Customer } from '@/lib/types'
import { withStats } from '@/lib/types'
import { REGION_META, REGIONS, getCountryView, type Region } from '@/lib/regions'
import { fmtMoney, statusBadgeClass } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

function MapLoading() {
  const { t } = useI18n()
  return (
    <div className="flex h-full items-center justify-center bg-muted/40 text-sm text-muted-foreground">
      {t('map.loading')}
    </div>
  )
}

const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => <MapLoading />,
})

export default function MapTab({
  customers,
  pendingFocus,
  onFocusConsumed,
}: {
  customers: Customer[]
  pendingFocus: { customerId: number; ts: number } | null
  onFocusConsumed: () => void
}) {
  const { t, regionLabel, regionShort, statusLabel } = useI18n()
  const [region, setRegion] = useState('ALL')
  const [country, setCountry] = useState('ALL')
  const [status, setStatus] = useState('ALL')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [focus, setFocus] = useState<{ customerId: number; ts: number } | null>(null)

  const REGION_CHIPS: { id: string; label: string }[] = [
    { id: 'ALL', label: t('filter.global') },
    ...REGIONS.filter((r) => r !== 'OTHER').map((r) => ({ id: r, label: regionShort(r) })),
  ]

  // 从其他页面跳转过来时定位客户
  useEffect(() => {
    if (!pendingFocus) return
    setRegion('ALL')
    setCountry('ALL')
    setSelectedId(pendingFocus.customerId)
    setFocus({ customerId: pendingFocus.customerId, ts: pendingFocus.ts + 1 })
    onFocusConsumed()

  }, [pendingFocus?.ts])

  // 切换区域时重置国家选择
  const onRegionChange = (r: string) => {
    setRegion(r)
    setCountry('ALL')
  }

  // 当前区域下有数据的国家列表（按客户数降序，用于国家下钻选择）
  const countryOptions = useMemo(() => {
    const base = region === 'ALL' ? customers : customers.filter((c) => c.region === region)
    const counts = new Map<string, number>()
    for (const c of base) counts.set(c.country, (counts.get(c.country) ?? 0) + 1)
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, n]) => ({ name, n }))
  }, [customers, region])

  // 选中国家后地图的目标视野（基于该国全部客户坐标，保证稳定不被状态/搜索筛选影响）
  const countryView = useMemo(() => {
    if (country === 'ALL') return null
    const pts = customers
      .filter((c) => c.country === country && c.latitude !== null && c.longitude !== null)
      .map((c) => [c.latitude, c.longitude] as [number, number])
    if (pts.length > 0) return { pts, fallback: null }
    return { pts: [], fallback: getCountryView(country) }
  }, [customers, country])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return customers.filter((c) => {
      if (region !== 'ALL' && c.region !== region) return false
      if (country !== 'ALL' && c.country !== country) return false
      if (status !== 'ALL' && c.status !== status) return false
      if (q) {
        const hay = `${c.owner} ${c.site} ${c.country}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [customers, region, country, status, search])

  const sorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) => (withStats(b).totalAnnualValueUsd ?? 0) - (withStats(a).totalAnnualValueUsd ?? 0)
      ),
    [filtered]
  )

  const noCoords = filtered.filter((c) => c.latitude === null || c.longitude === null)
  const totals = useMemo(() => {
    let mills = 0
    let value = 0
    for (const c of filtered) {
      mills += c.mills.length
      value += withStats(c).totalAnnualValueUsd ?? 0
    }
    return { customers: filtered.length, mills, value }
  }, [filtered])

  const focusOn = (id: number) => {
    setSelectedId(id)
    setFocus({ customerId: id, ts: Date.now() })
  }

  return (
    <div className="space-y-4">
      {/* 筛选栏 */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-1.5">
            {REGION_CHIPS.map((chip) => (
              <button
                key={chip.id}
                onClick={() => onRegionChange(chip.id)}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                  region === chip.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background hover:bg-muted'
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
            {/* 国家下钻：列出当前区域内有数据的国家 */}
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="w-[190px]">
                <Globe2 className="mr-1.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <SelectValue placeholder={t('map.countrySelect')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('map.allCountriesInRegion')}</SelectItem>
                {countryOptions.map((o) => (
                  <SelectItem key={o.name} value={o.name}>
                    <span className="flex items-center justify-between gap-3">
                      <span className="truncate">{o.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{o.n}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t('filter.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('filter.allStatuses')}</SelectItem>
                <SelectItem value="Existing Customer">{t('status.existing')}</SelectItem>
                <SelectItem value="Potential Customer">{t('status.potential')}</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('filter.searchOwnerSiteCountry')}
                className="w-[220px] pl-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 已选国家提示条 */}
      {country !== 'ALL' && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>
            {t('map.zoomedToCountry', { c: country })}
          </span>
          <button
            onClick={() => setCountry('ALL')}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            title={t('map.clearCountry')}
          >
            <X className="h-3 w-3" />
            {t('map.clearCountry')}
          </button>
        </div>
      )}

      {/* 地图 + 侧栏 */}
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card className="overflow-hidden p-0">
          <div className="relative h-[560px]">
            <LeafletMap
              customers={filtered}
              region={region}
              country={country}
              countryView={countryView}
              focus={focus}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            {/* 图例 */}
            <div className="pointer-events-none absolute bottom-2 left-2 z-[500] rounded-lg border bg-background/90 px-3 py-2 text-xs shadow-sm backdrop-blur">
              <div className="mb-1 font-medium text-foreground">{t('map.legendTitle')}</div>
              {REGIONS.filter((r) => r !== 'OTHER').map((r) => (
                <div key={r} className="flex items-center gap-1.5 text-muted-foreground">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: REGION_META[r].color }}
                  />
                  {regionLabel(r)}
                </div>
              ))}
              <div className="mt-1.5 border-t pt-1.5 text-muted-foreground">
                {t('map.legendHint')}
              </div>
            </div>
            {/* 经纬度缺失提示 */}
            {noCoords.length > 0 && (
              <div className="absolute right-2 top-2 z-[500] max-w-[280px] rounded-lg border border-amber-300 bg-amber-50/95 px-3 py-2 text-xs text-amber-900 shadow-sm dark:border-amber-800 dark:bg-amber-950/90 dark:text-amber-200">
                <div className="flex items-center gap-1 font-medium">
                  <MapPin className="h-3.5 w-3.5" />
                  {t('map.missingCoords', { n: noCoords.length })}
                </div>
                <div className="mt-0.5 opacity-80">
                  {noCoords.map((c) => `${c.owner}/${c.site || '—'}`).join('、')}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* 客户列表侧栏 */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('map.distribution', { n: totals.customers })}</CardTitle>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>{t('map.millsN', { n: totals.mills })}</span>
              <span>{t('map.annualN', { v: fmtMoney(totals.value) })}</span>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <div className="max-h-[520px] overflow-y-auto px-4 pb-4 [scrollbar-width:thin]">
              {sorted.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  {t('map.noMatch')}
                </div>
              )}
              <div className="space-y-1.5">
                {sorted.map((c) => {
                  const stats = withStats(c)
                  const meta = REGION_META[c.region as Region] ?? REGION_META.OTHER
                  const active = selectedId === c.id
                  return (
                    <button
                      key={c.id}
                      onClick={() => focusOn(c.id)}
                      className={cn(
                        'w-full rounded-lg border px-3 py-2.5 text-left transition-colors',
                        active
                          ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/30'
                          : 'border-border hover:bg-muted/60'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: meta.color }}
                        />
                        <span className="truncate text-sm font-medium">{c.owner}</span>
                        <span className="ml-auto shrink-0 text-xs font-semibold tabular-nums">
                          {fmtMoney(stats.totalAnnualValueUsd)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 pl-4.5 text-xs text-muted-foreground">
                        <span className="truncate">
                          {c.site || '—'} · {c.country}
                        </span>
                        <span className="ml-auto shrink-0">{t('map.millCountShort', { n: stats.millCount })}</span>
                      </div>
                      <div className="mt-1 pl-4.5">
                        <Badge variant="outline" className={cn('h-4 px-1.5 text-[10px]', statusBadgeClass(c.status))}>
                          {statusLabel(c.status)}
                        </Badge>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  PieChart, Pie, Legend, ScatterChart, Scatter, ZAxis,
} from 'recharts'
import type { Customer } from '@/lib/types'
import { useI18n } from '@/lib/i18n'
import { REGIONS } from '@/lib/regions'
import { fmtMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'

const PALETTE = [
  '#059669', '#d97706', '#e11d48', '#0d9488', '#ea580c',
  '#65a30d', '#c026d3', '#64748b', '#f59e0b', '#14b8a6',
]

interface MillPoint {
  key: string
  owner: string
  site: string
  country: string
  diameterFt: number
  setPriceUsd: number
  annualValueUsd: number
  supplier: string | null
  millType: string | null
}

export default function AnalyticsTab({ customers }: { customers: Customer[] }) {
  const { t, lang, regionShort, statusLabel } = useI18n()
  const [region, setRegion] = useState('ALL')
  const [status, setStatus] = useState('ALL')
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'
  const axisColor = dark ? '#94a3b8' : '#64748b'
  const gridColor = dark ? '#334155' : '#e2e8f0'

  const mills = useMemo<MillPoint[]>(() => {
    const out: MillPoint[] = []
    for (const c of customers) {
      if (region !== 'ALL' && c.region !== region) continue
      if (status !== 'ALL') {
        const s = c.status?.toLowerCase()
        const isExisting = s === 'existing customer' || s === 'current customer'
        if (status === 'Existing Customer' && !isExisting) continue
        if (status === 'Potential Customer' && s !== 'potential customer') continue
      }
      for (const m of c.mills) {
        out.push({
          key: `${c.id}-${m.id}`,
          owner: c.owner,
          site: c.site,
          country: c.country,
          diameterFt: m.diameterFt ?? NaN,
          setPriceUsd: m.setPriceUsd ?? NaN,
          annualValueUsd: m.annualValueUsd ?? NaN,
          supplier: m.supplier,
          millType: m.millType,
        })
      }
    }
    return out
  }, [customers, region, status])

  // 1. 业主 Top 10（按年潜在销售额）
  const byOwner = useMemo(() => {
    const map = new Map<string, number>()
    for (const m of mills) {
      if (isNaN(m.annualValueUsd)) continue
      map.set(m.owner, (map.get(m.owner) ?? 0) + m.annualValueUsd)
    }
    return [...map.entries()]
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .reverse()
  }, [mills])

  // 2. 国家销售额分布（仅有价格数据的国家）
  const byCountry = useMemo(() => {
    const map = new Map<string, number>()
    for (const m of mills) {
      if (isNaN(m.annualValueUsd) || m.annualValueUsd <= 0) continue
      map.set(m.country, (map.get(m.country) ?? 0) + m.annualValueUsd)
    }
    return [...map.entries()]
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12)
  }, [mills])

  // 2b. 各国磨机数量（含无价格数据的国家）
  const millsByCountry = useMemo(() => {
    const map = new Map<string, number>()
    for (const m of mills) map.set(m.country, (map.get(m.country) ?? 0) + 1)
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)
  }, [mills])

  // 3. 磨机类型构成（按销售额 + 台数）
  const byMillType = useMemo(() => {
    const map = new Map<string, { value: number; count: number }>()
    for (const m of mills) {
      const typeKey = m.millType ?? '__unknown__'
      const cur = map.get(typeKey) ?? { value: 0, count: 0 }
      cur.value += isNaN(m.annualValueUsd) ? 0 : m.annualValueUsd
      cur.count += 1
      map.set(typeKey, cur)
    }
    return [...map.entries()].map(([name, v]) => ({
      name: name === '__unknown__' ? t('common.unknown') : name,
      value: Math.round(v.value),
      count: v.count,
    }))
  }, [mills, t])

  // 4. 供应商份额
  const bySupplier = useMemo(() => {
    const map = new Map<string, number>()
    for (const m of mills) {
      if (isNaN(m.annualValueUsd)) continue
      const s = m.supplier || 'Unknown'
      map.set(s, (map.get(s) ?? 0) + m.annualValueUsd)
    }
    return [...map.entries()]
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [mills])

  // 5. 磨机直径分布（台数）——以稳定 id 存储，展示时按语言映射
  const byDiameter = useMemo(() => {
    const bucketIds = ['b22', 'b2328', 'b2932', 'b3336', 'b38', 'na'] as const
    const counts = new Map<string, number>(bucketIds.map((b) => [b, 0]))
    for (const m of mills) {
      if (isNaN(m.diameterFt)) counts.set('na', (counts.get('na') ?? 0) + 1)
      else if (m.diameterFt <= 22) counts.set('b22', (counts.get('b22') ?? 0) + 1)
      else if (m.diameterFt <= 28) counts.set('b2328', (counts.get('b2328') ?? 0) + 1)
      else if (m.diameterFt <= 32) counts.set('b2932', (counts.get('b2932') ?? 0) + 1)
      else if (m.diameterFt <= 36) counts.set('b3336', (counts.get('b3336') ?? 0) + 1)
      else counts.set('b38', (counts.get('b38') ?? 0) + 1)
    }
    const labels: Record<string, string> = {
      b22: '≤ 22 ft', b2328: '23–28 ft', b2932: '29–32 ft', b3336: '33–36 ft',
      b38: '≥ 38 ft', na: t('common.unknown'),
    }
    return bucketIds.map((id) => ({ name: labels[id], count: counts.get(id) ?? 0 }))
  }, [mills, t])

  // 6. 散点：磨机直径 × 衬板套价
  const scatter = useMemo(
    () => mills.filter((m) => !isNaN(m.diameterFt) && !isNaN(m.setPriceUsd)),
    [mills]
  )

  const regionChips = [
    { id: 'ALL', label: t('filter.allRegions') },
    ...REGIONS.filter((r) => r !== 'OTHER').map((r) => ({ id: r as string, label: regionShort(r) })),
  ]

  const moneyTick = (v: number) => fmtMoney(v)
  const tooltipStyle = {
    backgroundColor: dark ? '#1e293b' : '#ffffff',
    border: `1px solid ${gridColor}`,
    borderRadius: 8,
    fontSize: 12,
    color: dark ? '#f1f5f9' : '#0f172a',
  }

  return (
    <div className="space-y-4">
      {/* 筛选 */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="flex flex-wrap gap-1.5">
            {regionChips.map((chip) => (
              <button
                key={chip.id}
                onClick={() => setRegion(chip.id)}
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
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="ml-auto w-[170px]">
              <SelectValue placeholder={t('filter.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('filter.allStatuses')}</SelectItem>
              <SelectItem value="Existing Customer">{t('status.existing')}</SelectItem>
              <SelectItem value="Potential Customer">{t('status.potential')}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top 业主 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('an.topOwners')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={330}>
              <BarChart data={byOwner} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={moneyTick} tick={{ fill: axisColor, fontSize: 11 }} axisLine={{ stroke: gridColor }} tickLine={false} />
                <YAxis type="category" dataKey="name" width={150} tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [fmtMoney(v, { precise: true }), t('an.annualName')]}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {byOwner.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 国家分布 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('an.byCountry')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={330}>
              <BarChart data={byCountry} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 10 }} axisLine={{ stroke: gridColor }} tickLine={false} interval={0} angle={-30} textAnchor="end" height={55} />
                <YAxis tickFormatter={moneyTick} tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [fmtMoney(v, { precise: true }), t('an.annualName')]}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={36} fill="#059669" />
              </BarChart>
            </ResponsiveContainer>
            {byCountry.length <= 1 && (
              <p className="text-center text-xs text-muted-foreground">{t('an.onlyPriced')}</p>
            )}
          </CardContent>
        </Card>

        {/* 各国磨机数量 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('an.millsByCountry')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={330}>
              <BarChart data={millsByCountry} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 10 }} axisLine={{ stroke: gridColor }} tickLine={false} interval={0} angle={-30} textAnchor="end" height={55} />
                <YAxis allowDecimals={false} tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [t('an.countUnits', { n: v }), t('an.millCountName')]} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={36} fill="#0d9488" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 磨机类型构成 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('an.millTypeMix')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={330}>
              <PieChart>
                <Pie
                  data={byMillType}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={110}
                  paddingAngle={3}
                  label={(entry: { name?: string; count?: number }) =>
                    lang === 'zh' ? `${entry.name} (${entry.count}台)` : `${entry.name} (${entry.count})`
                  }
                >
                  {byMillType.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, name: string) => [fmtMoney(v, { precise: true }), t('an.valueSuffix', { name })]}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: axisColor }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 供应商份额 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('an.supplierShare')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={330}>
              <BarChart data={bySupplier} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 10 }} axisLine={{ stroke: gridColor }} tickLine={false} interval={0} angle={-25} textAnchor="end" height={55} />
                <YAxis tickFormatter={moneyTick} tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [fmtMoney(v, { precise: true }), t('an.annualName')]}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={36} fill="#d97706" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 直径分布 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('an.diameterDist')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byDiameter} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 11 }} axisLine={{ stroke: gridColor }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [t('an.countUnits', { n: v }), t('an.millCountName')]} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48} fill="#e11d48" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 散点图 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('an.scatterTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ left: 0, right: 10, top: 10, bottom: 5 }}>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                <XAxis
                  type="number" dataKey="diameterFt" name={t('an.diameter')}
                  domain={[15, 45]} ticks={[16, 20, 24, 28, 32, 36, 40]}
                  tick={{ fill: axisColor, fontSize: 11 }} axisLine={{ stroke: gridColor }} tickLine={false}
                  label={{ value: t('an.scatterX'), position: 'insideBottom', offset: -2, fill: axisColor, fontSize: 11 }}
                />
                <YAxis
                  type="number" dataKey="setPriceUsd" name={t('an.setPrice')}
                  tickFormatter={moneyTick} tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false}
                  label={{ value: t('an.scatterY'), angle: -90, position: 'insideLeft', fill: axisColor, fontSize: 11 }}
                />
                <ZAxis type="number" dataKey="annualValueUsd" range={[40, 400]} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  content={({ payload }) => {
                    if (!payload?.length) return null
                    const p = payload[0].payload as MillPoint
                    return (
                      <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md" style={tooltipStyle}>
                        <div className="font-semibold">{p.owner} · {p.site || '—'}</div>
                        <div className="text-muted-foreground">{p.country} · {p.supplier ?? t('an.supplierUnknown')}</div>
                        <div className="mt-1">{t('an.popupDiameter', { d: p.diameterFt, v: fmtMoney(p.setPriceUsd, { precise: true }) })}</div>
                        <div>{t('an.annualValue')} {fmtMoney(p.annualValueUsd, { precise: true })}</div>
                      </div>
                    )
                  }}
                />
                <Scatter data={scatter} fill="#0d9488" fillOpacity={0.65} />
              </ScatterChart>
            </ResponsiveContainer>
            <p className="mt-1 text-center text-xs text-muted-foreground">{t('an.scatterHint')}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

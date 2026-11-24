/** 金额格式化：$1.23M / $825K / $67.8M */
export function fmtMoney(v: number | null | undefined, opts?: { precise?: boolean }): string {
  if (v === null || v === undefined) return '—'
  const abs = Math.abs(v)
  if (opts?.precise) return '$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (abs >= 1_000_000_000) return '$' + (v / 1_000_000_000).toFixed(2) + 'B'
  if (abs >= 1_000_000) return '$' + (v / 1_000_000).toFixed(2) + 'M'
  if (abs >= 1_000) return '$' + (v / 1_000).toFixed(0) + 'K'
  return '$' + v.toFixed(0)
}

/** 重量格式化（kg）：350,000 kg 或 350 t */
export function fmtKg(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return v.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' kg'
}

export function fmtNum(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined) return '—'
  return v.toLocaleString('en-US', { maximumFractionDigits: digits })
}

export function fmtPrice(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return '$' + v.toFixed(2)
}

export function fmtLatLng(lat: number | null, lng: number | null): string {
  if (lat === null || lng === null) return '—'
  return `${lat.toFixed(3)}, ${lng.toFixed(3)}`
}

/** 状态徽章样式 */
export function statusBadgeClass(status: string): string {
  switch (status) {
    case 'Existing Customer':
    case 'Current Customer': // 兼容旧数据
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
    case 'Potential Customer':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-900'
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
  }
}

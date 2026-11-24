// 验证上传的 revB Excel 能否被 /api/import 的解析逻辑完整支持
// 逻辑与 src/app/api/import/route.ts 保持一致（复制解析部分，不写库）
import * as XLSX from 'xlsx'
import { getRegionByCountry } from '../src/lib/regions.ts'

const FILE = '/home/z/my-project/upload/Mill Liners Current and Potential Sales China 101126 revB.xlsx'

function toNum(v) {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[, $]/g, ''))
  return isNaN(n) ? null : n
}
function toStr(v) {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' ? null : s
}
function parseDiameterFt(label) {
  if (!label || /unknown/i.test(label)) return null
  const m = label.match(/(\d+(?:\.\d+)?)/)
  return m ? parseFloat(m[1]) : null
}

const HEADER_ALIASES = {
  src: ['src'],
  reviewed: ['reviewed'],
  status: ['status'],
  region: ['region'],
  country: ['country'],
  owner: ['owner', '公司', '业主'],
  site: ['site', '矿山', '项目'],
  equipment: ['equipment', '设备'],
  millNumber: ['mill #', 'mill#', 'mill no', 'mill no.', '磨机编号'],
  diameter: ['diameter', '直径'],
  length: ['length', '长度'],
  millType: ['mill type', 'milltype'],
  linerType: ['liner type', 'linertype'],
  linerSize: ['liner size', 'linersize'],
  material: ['material', '材质'],
  supplier: ['supplier', '供应商'],
  linerMassPerSetKg: ["liner mass per set kg's", 'liner mass per set kgs', 'liner mass per set kg'],
  annualLinerConsumptionKg: ['annual liner consumption'],
  sellPricePerKgUsd: ['sell price $/kg usd', 'sell price $/kg'],
  setPriceUsd: ['set price $', 'set price, $', 'set price'],
  annualValueUsd: ['total potential annual value', 'total potential annual value $'],
  latitude: ['latitude', 'lat', '纬度'],
  longitude: ['longitude', 'lng', 'lon', 'long', '经度'],
}
function norm(h) {
  return String(h ?? '').replace(/\s+/g, ' ').trim().toLowerCase()
}
function buildColumnMap(headerRow) {
  const map = {}
  headerRow.forEach((cell, idx) => {
    const h = norm(cell)
    if (!h) return
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(h) && map[field] === undefined) map[field] = idx
    }
  })
  return map
}
function isHeaderRow(row) {
  const cells = (row ?? []).map((c) => norm(c))
  const has = (field) => HEADER_ALIASES[field].some((a) => cells.includes(a))
  return has('owner') && (has('equipment') || has('country') || has('millType'))
}

import * as fs from 'node:fs'
const wb = XLSX.read(fs.readFileSync(FILE), { type: 'buffer' })
console.log('Sheets:', wb.SheetNames.join(' | '))

let sheetName = wb.SheetNames.find((n) => /data\s*entry/i.test(n))
if (!sheetName) {
  for (const n of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: null })
    if (rows.some((r) => isHeaderRow(r))) { sheetName = n; break }
  }
}
console.log('Selected sheet:', sheetName)

const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null })
const headerIdx = rows.findIndex((r) => isHeaderRow(r))
console.log('Header row index:', headerIdx)
console.log('Header cells:', JSON.stringify(rows[headerIdx]))

const cmap = buildColumnMap(rows[headerIdx])
console.log('Column map fields found:', Object.keys(cmap).length, '->', Object.keys(cmap).join(', '))
const missing = ['owner','site','country','equipment','millNumber','diameter','length','millType','linerType','linerSize','material','supplier','linerMassPerSetKg','annualLinerConsumptionKg','sellPricePerKgUsd','setPriceUsd','annualValueUsd','latitude','longitude','status','reviewed','region','src'].filter(f => cmap[f] === undefined)
console.log('MISSING fields:', missing.length ? missing.join(', ') : '(none)')

const g = (r, f) => (cmap[f] !== undefined ? r[cmap[f]] : null)

const parsed = []
for (let i = headerIdx + 1; i < rows.length; i++) {
  const r = rows[i]
  if (!r) continue
  const owner = toStr(g(r, 'owner'))
  if (!owner) continue
  const country = toStr(g(r, 'country')) || 'China'
  const diameterLabel = toStr(g(r, 'diameter'))
  parsed.push({
    row: i + 1,
    owner,
    site: toStr(g(r, 'site')) || '',
    country,
    fileRegion: toStr(g(r, 'region')),
    appRegion: getRegionByCountry(country) ?? 'OTHER',
    status: toStr(g(r, 'status')) ?? 'Potential Customer',
    reviewed: toStr(g(r, 'reviewed')) ?? 'NO',
    equipment: toStr(g(r, 'equipment')) ?? '',
    millNumber: toStr(g(r, 'millNumber')),
    diameterLabel,
    diameterFt: parseDiameterFt(diameterLabel),
    lengthLabel: toStr(g(r, 'length')),
    millType: toStr(g(r, 'millType')) ?? 'SAG',
    material: toStr(g(r, 'material')),
    supplier: toStr(g(r, 'supplier')),
    linerMassPerSetKg: toNum(g(r, 'linerMassPerSetKg')),
    annualLinerConsumptionKg: toNum(g(r, 'annualLinerConsumptionKg')),
    sellPricePerKgUsd: toNum(g(r, 'sellPricePerKgUsd')),
    setPriceUsd: toNum(g(r, 'setPriceUsd')),
    annualValueUsd: toNum(g(r, 'annualValueUsd')),
    latitude: toNum(g(r, 'latitude')),
    longitude: toNum(g(r, 'longitude')),
  })
}

console.log('\n===== PARSED ROWS:', parsed.length, '=====')

// 1) 区域划分核对：文件 Region 列 vs 应用按国家推导
const regionMismatch = parsed.filter(p => p.fileRegion && p.fileRegion !== p.appRegion)
console.log('\n[1] Region check: file Region column vs app-derived region')
if (regionMismatch.length === 0) console.log('    OK - all file regions match app region mapping')
else regionMismatch.forEach(p => console.log(`    MISMATCH row${p.row} ${p.country}: file=${p.fileRegion} app=${p.appRegion}`))

const regionSet = [...new Set(parsed.map(p => p.appRegion))]
console.log('    Regions in data:', regionSet.join(', '))

// 2) 状态值分布
const statusSet = {}
parsed.forEach(p => { statusSet[p.status] = (statusSet[p.status] || 0) + 1 })
console.log('\n[2] Status values:', JSON.stringify(statusSet))

// 3) 数值字段解析失败统计（应为空）
const badNums = parsed.filter(p =>
  (g(parsed.find(x=>x.row===p.row) ?? [], 'x') === 'x') || false)
const numericIssues = parsed.filter(p => {
  const src = rows[p.row - 1]
  const checks = [
    ['linerMassPerSetKg', g(src, 'linerMassPerSetKg')],
    ['setPriceUsd', g(src, 'setPriceUsd')],
    ['annualValueUsd', g(src, 'annualValueUsd')],
  ]
  return checks.some(([f, raw]) => toStr(raw) !== null && p[f] === null)
})
console.log('\n[3] Numeric parse failures:', numericIssues.length === 0 ? 'NONE - all numeric cells parsed' : numericIssues.map(p=>p.row))

// 4) 坐标分析：超范围 + 可疑（与国家包围盒比对）
console.log('\n[4] Coordinate sanity check (lat must be in [-90,90], lng in [-180,180])')
const outOfRange = parsed.filter(p => p.latitude !== null && p.longitude !== null && (Math.abs(p.latitude) > 90 || Math.abs(p.longitude) > 180))
console.log('    Out-of-range:', outOfRange.length, outOfRange.slice(0,5).map(p=>`row${p.row} ${p.country} (${p.latitude},${p.longitude})`))

// 粗略国家包围盒（验证"经纬度互换"怀疑）
const BBOX = {
  china: [18, 54, 73, 136], kazakhstan: [40, 56, 46, 88], serbia: [41, 47, 18, 24],
  ghana: [4, 12, -4, 2], "côte d'ivoire": [4, 11, -9, -2], zambia: [-18, -8, 21, 34],
  namibia: [-29, -17, 11, 26], drc: [-14, 6, 12, 32], columbia: [-5, 13, -80, -66],
  colombia: [-5, 13, -80, -66], guyana: [0, 9, -62, -56], suriname: [1, 7, -59, -53],
  ecuador: [-6, 3, -82, -74], peru: [-19, 1, -82, -68],
}
const inBbox = (c, lat, lng) => { const b = BBOX[String(c).trim().toLowerCase()]; if (!b) return null; return lat >= b[0] && lat <= b[1] && lng >= b[2] && lng <= b[3] }
const swapped = []
const outside = []
for (const p of parsed) {
  if (p.latitude === null || p.longitude === null) continue
  const ok = inBbox(p.country, p.latitude, p.longitude)
  const okSwap = inBbox(p.country, p.longitude, p.latitude)
  if (ok === null) continue
  if (!ok && okSwap) swapped.push(p)
  else if (!ok && !okSwap) outside.push(p)
}
console.log(`    Looks SWAPPED (lng,lat in file): ${swapped.length} rows`)
const byCountry = {}
swapped.forEach(p => { byCountry[p.country] = (byCountry[p.country] || 0) + 1 })
console.log('    by country:', JSON.stringify(byCountry))
console.log(`    Outside bbox even after swap: ${outside.length} rows`, outside.map(p=>`row${p.row} ${p.country} (${p.latitude},${p.longitude})`))
const chinaRows = parsed.filter(p => p.country === 'China' && p.latitude !== null)
console.log(`    China rows (correct orientation check): ${chinaRows.length} rows, all in bbox: ${chinaRows.every(p => inBbox('china', p.latitude, p.longitude))}`)

// 5) 特殊字符检查
const special = parsed.filter(p => /[Φφ×’‘”′″°ôé]|Côte/i.test(`${p.equipment} ${p.country} ${p.lengthLabel} ${p.diameterLabel}`))
console.log('\n[5] Rows with special chars (Φ × φ curly quotes accents):', special.length, '- sample:', JSON.stringify(special[0]?.equipment), JSON.stringify(special.find(p=>p.country.includes('Côte'))?.country))

// 6) 汇总
const mills = parsed.length
const customers = new Set(parsed.map(p => `${p.owner}|${p.site}|${p.country}`)).size
const totalAnnual = parsed.reduce((s, p) => s + (p.annualValueUsd ?? 0), 0)
console.log('\n===== SUMMARY =====')
console.log(`Data rows: ${mills}, Unique customers: ${customers}, Total annual value: $${totalAnnual.toLocaleString('en-US')}`)
const countries = [...new Set(parsed.map(p => p.country))]
console.log('Countries:', countries.join(', '))
const millTypes = {}, materials = {}, suppliers = {}
parsed.forEach(p => { millTypes[p.millType] = (millTypes[p.millType]||0)+1; if(p.material) materials[p.material]=(materials[p.material]||0)+1; if(p.supplier) suppliers[p.supplier]=(suppliers[p.supplier]||0)+1 })
console.log('Mill types:', JSON.stringify(millTypes))
console.log('Materials:', JSON.stringify(materials))
console.log('Suppliers:', JSON.stringify(suppliers))
const reviewed = {}
parsed.forEach(p => { reviewed[p.reviewed] = (reviewed[p.reviewed]||0)+1 })
console.log('Reviewed:', JSON.stringify(reviewed))

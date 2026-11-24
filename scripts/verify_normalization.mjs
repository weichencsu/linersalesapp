// 端到端验证：用修复后的 regions.ts / normalize.ts 逻辑跑一遍 revB 文件
import * as XLSX from 'xlsx'
import * as fs from 'node:fs'
import { getRegionByCountry, normalizeLatLng, getCountryBbox, getCountryView } from '../src/lib/regions.ts'
import { normalizeStatus } from '../src/lib/normalize.ts'

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

const HEADER_ALIASES = {
  owner: ['owner'], site: ['site'], country: ['country'], status: ['status'], reviewed: ['reviewed'],
  equipment: ['equipment'], millNumber: ['mill #'], diameter: ['diameter'], millType: ['mill type'],
  latitude: ['latitude'], longitude: ['longitude'],
}
const norm = (h) => String(h ?? '').replace(/\s+/g, ' ').trim().toLowerCase()
function buildColumnMap(headerRow) {
  const map = {}
  headerRow.forEach((cell, idx) => {
    const h = norm(cell)
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(h) && map[field] === undefined) map[field] = idx
    }
  })
  return map
}

const wb = XLSX.read(fs.readFileSync(FILE), { type: 'buffer' })
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Data Entry'], { header: 1, defval: null })
const headerIdx = rows.findIndex((r) => r.map(norm).includes('owner') && r.map(norm).includes('equipment'))
const cmap = buildColumnMap(rows[headerIdx])
const g = (r, f) => (cmap[f] !== undefined ? r[cmap[f]] : null)

let swapped = 0, kept = 0, noCoords = 0
const afterFix = []
const statusAfter = {}
for (let i = headerIdx + 1; i < rows.length; i++) {
  const r = rows[i]
  const owner = toStr(g(r, 'owner'))
  if (!owner) continue
  const country = toStr(g(r, 'country')) || 'China'
  const coords = normalizeLatLng(toNum(g(r, 'latitude')), toNum(g(r, 'longitude')), country)
  if (coords.latitude === null || coords.longitude === null) noCoords++
  else if (coords.swapped) swapped++
  else kept++
  const status = normalizeStatus(g(r, 'status'))
  statusAfter[status] = (statusAfter[status] || 0) + 1
  afterFix.push({ owner, country, lat: coords.latitude, lng: coords.longitude, status, region: getRegionByCountry(country) ?? 'OTHER' })
}

console.log('Rows:', afterFix.length)
console.log('Coords: swapped-fixed =', swapped, '| kept =', kept, '| missing =', noCoords)
console.log('Status after normalize:', JSON.stringify(statusAfter))

// 校验修复后所有坐标都落在国家包围盒内
const bad = afterFix.filter(p => {
  if (p.lat === null) return false
  const b = getCountryBbox(p.country)
  if (!b) return false
  return !(p.lat >= b[0] && p.lat <= b[1] && p.lng >= b[2] && p.lng <= b[3])
})
console.log('Rows still outside country bbox after fix:', bad.length, bad.slice(0, 5))

// 抽查关键点位
const spot = (owner, country) => afterFix.find(p => p.owner === owner && p.country === country)
console.log('\nSpot checks (after normalization):')
console.log('  Zijin/Rakita Serbia   :', JSON.stringify(spot('Zijin Mining', 'Serbia')))
console.log('  Zijin/RG Gold Kazakh  :', JSON.stringify(spot('Zijin Mining', 'Kazakhstan')))
console.log('  CMOC/TFM DRC          :', JSON.stringify(spot('CMOC', 'DRC')))
console.log('  Shandong Gold Ghana   :', JSON.stringify(spot('Shandong Gold', 'Ghana')))
console.log('  MMG Las Bambas Peru   :', JSON.stringify(spot('MMG', 'Peru')))
console.log('  Zijin Rosebel Suriname:', JSON.stringify(spot('Zijin Mining', 'Suriname')))
console.log('  Zijin Julong China    :', JSON.stringify(spot('Zijin Mining', 'China')))

// normalizeStatus 单元测试
console.log('\nnormalizeStatus unit tests:')
console.log('  "Current Customer"  ->', normalizeStatus('Current Customer'))
console.log('  "current customer"  ->', normalizeStatus('current customer'))
console.log('  "Existing Customer" ->', normalizeStatus('Existing Customer'))
console.log('  "Potential Customer"->', normalizeStatus('Potential Customer'))
console.log('  ""                  ->', normalizeStatus(''))
console.log('  "Other"             ->', normalizeStatus('Other'))

// COUNTRY_VIEWS 新增别名检查
console.log('\nCOUNTRY_VIEWS fallback for DRC/Columbia:', !!getCountryView('DRC'), !!getCountryView('Columbia'))

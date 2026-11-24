/**
 * 种子数据脚本：导入磨机衬板客户数据
 * 用法: bun prisma/seed.mjs  或  node prisma/seed.mjs
 *
 * 数据来源:
 *  1. 《Mill Liners Current and Potential Sales China 101126 revB.xlsx》Data Entry 表（132 行磨机数据，含中国区与国际区域）
 *  2. 2025-11 销售演示 PDF（仅补充 revB 中未覆盖的潜在客户，避免重复）
 */
import { PrismaClient } from '@prisma/client'
import * as XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 显式定位项目根下的 db/custom.db（避免 .env 相对路径按 schema 目录解析到错误位置）
process.env.DATABASE_URL = 'file:' + path.resolve(__dirname, '..', 'db', 'custom.db')

const db = new PrismaClient()

// ---------- 中国区矿山坐标（owner+site → [lat, lng]，供地图显示，可在应用中编辑修正） ----------
const SITE_COORDS = {
  'China Gold Group|Mt Wulugetu': [49.45, 117.72], // 乌努格吐山铜钼矿 内蒙古新巴尔虎右旗
  'China Gold|Wushan': [49.48, 117.78], // 乌山（乌努格吐山二期）内蒙古
  'China Gold|Huatailong': [29.63, 91.68], // 甲玛铜多金属矿 西藏墨竹工卡
  'Dahongshan Iron Ore|': [24.06, 102.02], // 大红山铁矿 云南新平
  'JCC|Dexing Copper': [28.95, 117.73], // 德兴铜矿 江西
  'TISCO|Yuanjiacun': [38.02, 111.42], // 袁家村铁矿 山西岚县
  'Tongling Copper|Dongguashan': [30.95, 117.95], // 冬瓜山铜矿 安徽铜陵
  'Zijin Mining|Tibet Zijin Julong Copper': [29.72, 88.85], // 巨龙（驱龙）铜矿 西藏墨竹工卡
  'Zijin Mining|Tibet Zijin Julong Copper Exp': [29.71, 88.87], // 巨龙二期
  'Zijin Mining|Zijinshan': [25.63, 116.38], // 紫金山金铜矿 福建上杭
  'Zijin Mining|Shanxi': [39.25, 113.2], // 义兴寨金矿 山西繁峙
  'Zijin Mining|Duobaoshan': [50.23, 125.7], // 多宝山铜矿 黑龙江嫩江
  'Zijin Mining|Yulong': [31.45, 97.65], // 玉龙铜矿 西藏江达
  'Zijin Mining|Xianglong': [29.8, 87.65], // 翔龙（朱诺）铜矿 西藏昂仁
  'Zijin Mining|Duolong': [32.2, 87.35], // 雄村铜矿 西藏谢通门
  'Chinalco|Pulang': [28.42, 99.98], // 普朗铜矿 云南香格里拉
  'Chinalco|Jinlong': [32.25, 87.15], // 金龙（铁格隆南）铜矿 西藏改则
  'Hongda Limited|Duolong': [32.38, 87.02], // 多龙铜矿集区 西藏改则
  'Qinghai Yellow River Mining|Xiarihamu Ni-Co': [36.15, 93.78], // 夏日哈木镍钴矿 青海格尔木
  'Chifeng Gold|Wulong': [40.2, 124.32], // 五龙金矿 辽宁丹东
}

// ---------- 2025-11 销售演示 PDF 中的潜在客户（仅保留 revB Excel 未覆盖的，避免重复） ----------
// 磨机参数来自演示文档，部分待核实；金额字段留空，由用户在应用中补充
// 注：区域完整映射见 src/lib/regions.ts，此处直接指定
const PRESENTATION_CUSTOMERS = [
  // ---- EUR 区域（塞尔维亚 Bor 既有运营等） ----
  { owner: 'Zijin Mining', site: 'Serbian Operations', country: 'Serbia', region: 'EUR', status: 'Existing Customer', coords: [44.07, 22.1], mills: [] }, // Bor 铜矿既有运营
  // ---- AFR 区域（刚果金/科特迪瓦） ----
  { owner: 'Zijin Mining', site: 'Kolwezi', country: 'DR Congo', region: 'AFR', status: 'Potential Customer', coords: [-10.72, 25.5], mills: [{ equipment: "32' SAG", millType: 'SAG', diameterFt: 32 }] },
  { owner: 'Zijin Mining', site: 'Tongon', country: "Côte d'Ivoire", region: 'AFR', status: 'Potential Customer', coords: [9.85, -5.55], mills: [{ equipment: "32' SAG", millType: 'SAG', diameterFt: 32 }] },
  // ---- APAC 区域（蒙古） ----
  { owner: 'Zijin Mining', site: 'Xanadu', country: 'Mongolia', region: 'APAC', status: 'Potential Customer', coords: [43.85, 105.75], mills: [{ equipment: "36' SAG", millType: 'SAG', diameterFt: 36 }] }, // Kharmagtai 铜金矿
  // ---- SAM 区域 ----
  { owner: 'CMOC', site: 'Cangrejos', country: 'Ecuador', region: 'SAM', status: 'Potential Customer', coords: [-3.15, -79.85], mills: [{ equipment: "32' SAG", millType: 'SAG', diameterFt: 32 }] },
  { owner: 'CRSSG', site: 'El Domo', country: 'Ecuador', region: 'SAM', status: 'Potential Customer', coords: [-1.68, -79.52], mills: [{ equipment: "32' SAG", millType: 'SAG', diameterFt: 32 }] },
  { owner: 'Zijin Mining', site: 'Rio Blanco', country: 'Peru', region: 'SAM', status: 'Potential Customer', coords: [-4.98, -79.43], mills: [{ equipment: "32' SAG", millType: 'SAG', diameterFt: 32 }] },
]

// ---------- 工具函数 ----------
function parseDiameterFt(label) {
  if (!label) return null
  const s = String(label).trim()
  if (/unknown/i.test(s)) return null
  const m = s.match(/(\d+(?:\.\d+)?)/)
  return m ? parseFloat(m[1]) : null
}

// 国家 → 销售区域（仅覆盖种子数据中出现的国家；完整映射见 src/lib/regions.ts）
const COUNTRY_REGIONS = {
  china: 'CIS', kazakhstan: 'CIS',
  serbia: 'EUR',
  'dr congo': 'AFR', drc: 'AFR', ghana: 'AFR', "côte d'ivoire": 'AFR', zambia: 'AFR', namibia: 'AFR',
  mongolia: 'APAC',
  suriname: 'SAM', guyana: 'SAM', ecuador: 'SAM', peru: 'SAM', colombia: 'SAM', columbia: 'SAM',
}

function regionOfCountry(country) {
  const key = String(country || '').trim().toLowerCase()
  if (COUNTRY_REGIONS[key]) return COUNTRY_REGIONS[key]
  if (key.includes('congo') || key === 'drc' || key === 'dr congo' || key === 'democratic republic of the congo') return 'AFR'
  if (key === "côte d'ivoire" || key === "cote d'ivoire" || key === 'ivory coast') return 'AFR'
  return 'OTHER'
}

function toNum(v) {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return isNaN(v) ? null : v
  const s = String(v).replace(/[, $]/g, '').trim()
  if (!s || /unknown/i.test(s)) return null
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function toStr(v) {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

// 状态归一（兼容旧写法 Current Customer）
function normalizeStatus(v) {
  const s = String(v ?? '').trim()
  if (/^current customer$/i.test(s) || /^existing customer$/i.test(s)) return 'Existing Customer'
  if (/^potential customer$/i.test(s)) return 'Potential Customer'
  return s || 'Potential Customer'
}

// 国家粗略包围盒（用于经纬度互换检测；与 src/lib/regions.ts 保持一致，仅覆盖种子涉及国家）
const SEED_BBOX = {
  china: [17.5, 53.6, 73.5, 135.1], kazakhstan: [40.4, 55.5, 46.4, 87.4],
  serbia: [41.8, 46.2, 18.8, 23.0],
  ghana: [4.5, 11.2, -3.3, 1.3], "côte d'ivoire": [4.3, 10.8, -8.6, -2.5], zambia: [-18.1, -8.2, 21.9, 33.7],
  namibia: [-28.9, -16.9, 11.5, 25.3], 'dr congo': [-13.5, 5.4, 12.0, 31.4], drc: [-13.5, 5.4, 12.0, 31.4],
  columbia: [-4.3, 12.6, -82.1, -66.8], colombia: [-4.3, 12.6, -82.1, -66.8],
  guyana: [0.9, 8.6, -61.4, -56.4], suriname: [1.8, 6.1, -58.2, -53.8],
  ecuador: [-5.1, 1.5, -81.1, -75.2], peru: [-18.4, 0.0, -81.4, -68.6], mongolia: [41.4, 52.2, 87.4, 119.9],
}

// 经纬度归一：检测并纠正互换（越界或落在国家包围盒外而互换后在盒内）
function normalizeLatLng(lat, lng, country) {
  if (lat === null || lng === null) return { latitude: lat, longitude: lng, swapped: false }
  const key = String(country || '').trim().toLowerCase().replace(/\s+/g, ' ')
  const valid = (la, lo) => Math.abs(la) <= 90 && Math.abs(lo) <= 180
  const swapIfBetter = () => (valid(lng, lat) ? { latitude: lng, longitude: lat, swapped: true } : { latitude: lat, longitude: lng, swapped: false })
  if (!valid(lat, lng)) return swapIfBetter()
  const b = SEED_BBOX[key]
  if (b) {
    const inBox = (la, lo) => la >= b[0] && la <= b[1] && lo >= b[2] && lo <= b[3]
    if (!inBox(lat, lng) && inBox(lng, lat)) return { latitude: lng, longitude: lat, swapped: true }
  }
  return { latitude: lat, longitude: lng, swapped: false }
}

// ---------- 读取 Excel ----------
function readExcelRows() {
  // 优先使用项目内副本（最新 revB），否则回退到旧模板 / upload 目录
  const candidates = [
    path.join(__dirname, '..', 'data', 'Mill Liners Current and Potential Sales China 101126 revB.xlsx'),
    path.join(__dirname, '..', 'data', 'Mill Liners Data Entry.xlsx'),
    '/home/z/my-project/upload/Mill Liners Current and Potential Sales China 101126 revB.xlsx',
  ]
  const file = candidates.find((f) => fs.existsSync(f))
  if (!file) {
    console.warn('⚠ 未找到 Excel 数据文件，跳过 Excel 导入')
    return []
  }
  const wb = XLSX.read(fs.readFileSync(file), { type: 'buffer' })
  const ws = wb.Sheets['Data Entry']
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
  // 定位表头行（含 Owner 与 Equipment 的行）
  const headerIdx = rows.findIndex((r) => {
    const cells = (r || []).map((c) => String(c ?? '').replace(/\s+/g, ' ').trim().toLowerCase())
    return cells.includes('owner') && cells.includes('equipment')
  })
  if (headerIdx < 0) {
    console.warn('⚠ 未在 Data Entry 表中找到表头行')
    return []
  }
  const headers = rows[headerIdx].map((c) => String(c ?? '').replace(/\s+/g, ' ').trim().toLowerCase())
  const col = (name) => headers.findIndex((h) => h === name)
  const c = {
    src: col('src'), reviewed: col('reviewed'), status: col('status'), region: col('region'),
    country: col('country'), owner: col('owner'), site: col('site'), equipment: col('equipment'),
    millNum: col('mill #'), diameter: col('diameter'), length: col('length'), millType: col('mill type'),
    linerType: col('liner type'), linerSize: col('liner size'), material: col('material'), supplier: col('supplier'),
    mass: col("liner mass per set kg's"), consumption: col('annual liner consumption'),
    price: col('sell price $/kg usd'), setPrice: col('set price, $'), annualValue: col('total potential annual value'),
    lat: col('latitude'), lng: col('longitude'),
  }
  const out = []
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r) continue
    const owner = toStr(r[c.owner])
    const country = toStr(r[c.country])
    if (!owner && !country) continue // 跳过空行/汇总行
    if (!owner) continue
    out.push({
      reviewed: toStr(r[c.reviewed]) || 'NO',
      status: toStr(r[c.status]) || 'Potential Customer',
      region: toStr(r[c.region]),
      country: country || 'China',
      owner,
      site: toStr(r[c.site]) || '',
      equipment: toStr(r[c.equipment]) || '',
      millNumber: toStr(r[c.millNum]),
      diameterLabel: toStr(r[c.diameter]),
      lengthLabel: toStr(r[c.length]),
      millType: toStr(r[c.millType]) || 'SAG',
      linerType: toStr(r[c.linerType]),
      linerSize: toStr(r[c.linerSize]),
      material: toStr(r[c.material]),
      supplier: toStr(r[c.supplier]),
      linerMassPerSetKg: toNum(r[c.mass]),
      annualLinerConsumptionKg: toNum(r[c.consumption]),
      sellPricePerKgUsd: toNum(r[c.price]),
      setPriceUsd: toNum(r[c.setPrice]),
      annualValueUsd: toNum(r[c.annualValue]),
      latitude: toNum(r[c.lat]),
      longitude: toNum(r[c.lng]),
    })
  }
  return out
}

// ---------- 主流程 ----------
async function main() {
  console.log('🚀 开始导入种子数据 ...')

  const excelRows = readExcelRows()
  console.log(`📄 Excel 读取到 ${excelRows.length} 行磨机数据`)

  // 按 owner+site+country 聚合为客户
  let coordsFixed = 0
  const customerMap = new Map()
  for (const row of excelRows) {
    const key = `${row.owner}|${row.site}|${row.country}`
    if (!customerMap.has(key)) {
      // 坐标：优先用 Excel 自带的经纬度（自动纠正互换），缺失时回退到内置坐标表
      const fallback = SITE_COORDS[`${row.owner}|${row.site}`]
      const coords = normalizeLatLng(row.latitude, row.longitude, row.country)
      if (coords.swapped) coordsFixed++
      const latitude = coords.latitude ?? fallback?.[0] ?? null
      const longitude = coords.longitude ?? fallback?.[1] ?? null
      customerMap.set(key, {
        owner: row.owner,
        site: row.site,
        country: row.country,
        region: regionOfCountry(row.country) || row.region || 'OTHER',
        status: normalizeStatus(row.status),
        reviewed: row.reviewed,
        latitude,
        longitude,
        notes: '导入自 Mill Liners Current and Potential Sales China 101126 revB.xlsx',
        mills: [],
      })
    }
    customerMap.get(key).mills.push({
      equipment: row.equipment,
      millNumber: row.millNumber,
      diameterLabel: row.diameterLabel,
      diameterFt: parseDiameterFt(row.diameterLabel),
      lengthLabel: row.lengthLabel,
      millType: row.millType,
      linerType: row.linerType,
      linerSize: row.linerSize,
      material: row.material,
      supplier: row.supplier,
      linerMassPerSetKg: row.linerMassPerSetKg,
      annualLinerConsumptionKg: row.annualLinerConsumptionKg,
      sellPricePerKgUsd: row.sellPricePerKgUsd,
      setPriceUsd: row.setPriceUsd,
      annualValueUsd: row.annualValueUsd,
    })
  }

  // 演示 PDF 客户
  for (const p of PRESENTATION_CUSTOMERS) {
    const key = `${p.owner}|${p.site}|${p.country}`
    customerMap.set(key, {
      owner: p.owner,
      site: p.site,
      country: p.country,
      region: p.region,
      status: p.status,
      reviewed: 'NO',
      latitude: p.coords[0],
      longitude: p.coords[1],
      notes: '导入自 2025-11 销售演示文档（Targeted Global Customer），磨机参数待核实、销售金额待补充',
      mills: p.mills.map((m) => ({
        equipment: m.equipment,
        millNumber: null,
        diameterLabel: m.diameterFt ? `${m.diameterFt}'` : null,
        diameterFt: m.diameterFt,
        lengthLabel: null,
        millType: m.millType,
        linerType: null,
        linerSize: null,
        material: null,
        supplier: null,
        linerMassPerSetKg: null,
        annualLinerConsumptionKg: null,
        sellPricePerKgUsd: null,
        setPriceUsd: null,
        annualValueUsd: null,
      })),
    })
  }

  console.log(`🏢 共 ${customerMap.size} 个客户（矿山），经纬度互换自动纠正 ${coordsFixed} 行`)

  // 清空后重建（保证可重复执行）
  await db.mill.deleteMany({})
  await db.customer.deleteMany({})

  let millCount = 0
  for (const cust of customerMap.values()) {
    await db.customer.create({
      data: {
        owner: cust.owner,
        site: cust.site,
        country: cust.country,
        region: cust.region,
        status: cust.status,
        reviewed: cust.reviewed,
        latitude: cust.latitude,
        longitude: cust.longitude,
        notes: cust.notes,
        mills: { create: cust.mills },
      },
    })
    millCount += cust.mills.length
  }

  console.log(`✅ 导入完成：${customerMap.size} 个客户，${millCount} 台磨机`)

  // 校验合计（与 Excel 总计对照）
  const agg = await db.mill.aggregate({ _sum: { setPriceUsd: true, annualValueUsd: true } })
  console.log(`💰 Set Price 合计: $${(agg._sum.setPriceUsd ?? 0).toLocaleString('en-US')}`)
  console.log(`💰 年潜在销售额合计: $${(agg._sum.annualValueUsd ?? 0).toLocaleString('en-US')}`)
}

main()
  .catch((e) => {
    console.error('❌ 种子数据导入失败:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())

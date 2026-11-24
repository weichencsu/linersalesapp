import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { getRegionByCountry, normalizeLatLng } from '@/lib/regions'
import { normalizeStatus } from '@/lib/normalize'
import * as XLSX from 'xlsx'

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[, $]/g, ''))
  return isNaN(n) ? null : n
}
function toStr(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' ? null : s
}
function parseDiameterFt(label: string | null): number | null {
  if (!label || /unknown/i.test(label)) return null
  const m = label.match(/(\d+(?:\.\d+)?)/)
  return m ? parseFloat(m[1]) : null
}

const HEADER_ALIASES: Record<string, string[]> = {
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

function norm(h: string): string {
  return String(h ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function buildColumnMap(headerRow: unknown[]) {
  const map: Record<string, number> = {}
  headerRow.forEach((cell, idx) => {
    const h = norm(cell as string)
    if (!h) return
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(h) && map[field] === undefined) {
        map[field] = idx
      }
    }
  })
  return map
}

function isHeaderRow(row: unknown[]): boolean {
  const cells = (row ?? []).map((c) => norm(c as string))
  const has = (field: string) => HEADER_ALIASES[field].some((a) => cells.includes(a))
  return has('owner') && (has('equipment') || has('country') || has('millType'))
}

// POST /api/import —— Excel 批量导入（Data Entry 格式）
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error
  try {
    const formData = await req.formData()
    const file = formData.get('file')
    const mode = String(formData.get('mode') ?? 'append') // append | replace
    if (!(file instanceof File)) {
      return Response.json({ error: '请选择 Excel 文件（.xlsx）' }, { status: 400 })
    }

    const buf = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buf, { type: 'buffer' })

    // 优先 Data Entry 表；否则在所有表中查找含表头的表
    let sheetName = wb.SheetNames.find((n) => /data\s*entry/i.test(n))
    if (!sheetName) {
      for (const n of wb.SheetNames) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: null })
        if (rows.some((r) => isHeaderRow(r as unknown[]))) {
          sheetName = n
          break
        }
      }
    }
    if (!sheetName) {
      return Response.json(
        { error: '未找到包含 Owner / Equipment 表头的数据表（支持 Data Entry 格式）' },
        { status: 400 }
      )
    }

    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null })

    // 定位表头行
    const headerIdx = rows.findIndex((r) => isHeaderRow(r as unknown[]))
    if (headerIdx < 0) {
      return Response.json({ error: `表 ${sheetName} 中未找到表头行` }, { status: 400 })
    }
    const cmap = buildColumnMap(rows[headerIdx] as unknown[])
    if (cmap.owner === undefined) {
      return Response.json({ error: '未找到 Owner 列' }, { status: 400 })
    }
    const g = (r: unknown[], f: string) => (cmap[f] !== undefined ? r[cmap[f]] : null)

    // 解析数据行
    const parsed: {
      owner: string
      site: string
      country: string
      region: string
      status: string
      reviewed: string
      latitude: number | null
      longitude: number | null
      mill: Record<string, unknown>
    }[] = []
    let coordsFixed = 0

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const r = rows[i] as unknown[]
      if (!r) continue
      const owner = toStr(g(r, 'owner'))
      if (!owner) continue // 跳过空行/汇总行
      const country = toStr(g(r, 'country')) || 'China'
      const site = toStr(g(r, 'site')) || ''
      const diameterLabel = toStr(g(r, 'diameter'))
      // 经纬度规范化：自动检测并纠正经纬度互换（如 塞尔维亚 22.13,44.02 → 44.02,22.13）
      const coords = normalizeLatLng(toNum(g(r, 'latitude')), toNum(g(r, 'longitude')), country)
      if (coords.swapped) coordsFixed++
      const mill = {
        equipment: toStr(g(r, 'equipment')) ?? '',
        millNumber: toStr(g(r, 'millNumber')),
        diameterLabel,
        diameterFt: parseDiameterFt(diameterLabel),
        lengthLabel: toStr(g(r, 'length')),
        millType: toStr(g(r, 'millType')) ?? 'SAG',
        linerType: toStr(g(r, 'linerType')),
        linerSize: toStr(g(r, 'linerSize')),
        material: toStr(g(r, 'material')),
        supplier: toStr(g(r, 'supplier')),
        linerMassPerSetKg: toNum(g(r, 'linerMassPerSetKg')),
        annualLinerConsumptionKg: toNum(g(r, 'annualLinerConsumptionKg')),
        sellPricePerKgUsd: toNum(g(r, 'sellPricePerKgUsd')),
        setPriceUsd: toNum(g(r, 'setPriceUsd')),
        annualValueUsd: toNum(g(r, 'annualValueUsd')),
      }
      parsed.push({
        owner,
        site,
        country,
        region: getRegionByCountry(country) ?? 'OTHER',
        status: normalizeStatus(g(r, 'status')),
        reviewed: toStr(g(r, 'reviewed')) ?? 'NO',
        latitude: coords.latitude,
        longitude: coords.longitude,
        mill,
      })
    }

    if (parsed.length === 0) {
      return Response.json({ error: '表格中没有有效数据行' }, { status: 400 })
    }

    // 整体放入事务：任一步失败则回滚，避免"替换全部"中途出错丢数据
    const result = await db.$transaction(
      async (tx) => {
        // replace 模式：清空现有数据
        if (mode === 'replace') {
          await tx.mill.deleteMany({})
          await tx.customer.deleteMany({})
        }

        // 读取现有客户与磨机（追加模式下用于去重）
        const existingCustomers = await tx.customer.findMany({ include: { mills: true } })
        const custMap = new Map(existingCustomers.map((c) => [`${c.owner}|${c.site}|${c.country}`, c]))

        let createdCustomers = 0
        let updatedCustomers = 0
        let createdMills = 0
        let skippedMills = 0
        let regionFixed = 0

        for (const row of parsed) {
          const key = `${row.owner}|${row.site}|${row.country}`
          let cust = custMap.get(key)
          if (!cust) {
            const created = await tx.customer.create({
              data: {
                owner: row.owner,
                site: row.site,
                country: row.country,
                region: row.region,
                status: row.status,
                reviewed: row.reviewed,
                latitude: row.latitude,
                longitude: row.longitude,
                notes: `Excel 导入（${new Date().toLocaleDateString('zh-CN')}）`,
              },
            })
            cust = { ...created, mills: [] }
            custMap.set(key, cust)
            createdCustomers++
          } else {
            updatedCustomers++
            // 区域纠偏（按国家自动划分）
            if (cust.region !== row.region) regionFixed++
            // 补充缺失的经纬度
            const patch: Record<string, unknown> = {}
            if ((cust.latitude === null || cust.longitude === null) && row.latitude !== null && row.longitude !== null) {
              patch.latitude = row.latitude
              patch.longitude = row.longitude
            }
            if (cust.region !== row.region) patch.region = row.region
            if (Object.keys(patch).length > 0) {
              await tx.customer.update({ where: { id: cust.id }, data: patch })
            }
          }

          // 磨机去重：完全一致的行跳过（追加模式）
          const m = row.mill as Record<string, unknown>
          const dup = cust.mills.some((x) =>
            x.equipment === m.equipment &&
            (x.millNumber ?? '') === (m.millNumber ?? '') &&
            (x.diameterLabel ?? '') === (m.diameterLabel ?? '') &&
            (x.supplier ?? '') === (m.supplier ?? '') &&
            (x.setPriceUsd ?? -1) === (m.setPriceUsd ?? -1) &&
            (x.annualValueUsd ?? -1) === (m.annualValueUsd ?? -1)
          )
          if (dup && mode === 'append') {
            skippedMills++
            continue
          }
          await tx.mill.create({ data: { ...m, customerId: cust.id } as never })
          cust.mills.push(m as never)
          createdMills++
        }

        return { createdCustomers, updatedCustomers, createdMills, skippedMills, regionFixed, coordsFixed }
      },
      { timeout: 60000 }
    )

    return Response.json({
      ok: true,
      sheetName,
      totalRows: parsed.length,
      ...result,
    })
  } catch (e) {
    console.error('POST /api/import error:', e)
    return Response.json({ error: '导入失败，请检查文件格式' }, { status: 500 })
  }
}

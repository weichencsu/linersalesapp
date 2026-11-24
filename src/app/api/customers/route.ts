import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, requireAdmin } from '@/lib/auth'
import { getRegionByCountry, normalizeLatLng, REGIONS } from '@/lib/regions'
import { normalizeStatus } from '@/lib/normalize'

// GET /api/customers —— 全量客户（含磨机）
export async function GET() {
  const { error } = await requireUser()
  if (error) return error
  try {
    const customers = await db.customer.findMany({
      include: { mills: { orderBy: { id: 'asc' } } },
      orderBy: [{ region: 'asc' }, { country: 'asc' }, { owner: 'asc' }, { site: 'asc' }],
    })
    return Response.json(customers)
  } catch (e) {
    console.error('GET /api/customers error:', e)
    return Response.json({ error: '读取客户数据失败' }, { status: 500 })
  }
}

function parseMillInput(m: Record<string, unknown>) {
  const num = (v: unknown): number | null => {
    if (v === null || v === undefined || v === '') return null
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[, $]/g, ''))
    return isNaN(n) ? null : n
  }
  const str = (v: unknown): string | null => {
    if (v === null || v === undefined) return null
    const s = String(v).trim()
    return s === '' ? null : s
  }
  const diameterLabel = str(m.diameterLabel)
  let diameterFt = num(m.diameterFt)
  if (diameterFt === null && diameterLabel && !/unknown/i.test(diameterLabel)) {
    const match = diameterLabel.match(/(\d+(?:\.\d+)?)/)
    if (match) diameterFt = parseFloat(match[1])
  }
  return {
    equipment: String(m.equipment ?? ''),
    millNumber: str(m.millNumber),
    diameterLabel,
    diameterFt,
    lengthLabel: str(m.lengthLabel),
    millType: str(m.millType),
    linerType: str(m.linerType),
    linerSize: str(m.linerSize),
    material: str(m.material),
    supplier: str(m.supplier),
    linerMassPerSetKg: num(m.linerMassPerSetKg),
    annualLinerConsumptionKg: num(m.annualLinerConsumptionKg),
    sellPricePerKgUsd: num(m.sellPricePerKgUsd),
    setPriceUsd: num(m.setPriceUsd),
    annualValueUsd: num(m.annualValueUsd),
  }
}

// POST /api/customers —— 新增客户（可同时带磨机）
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error
  try {
    const body = await req.json()
    const owner = String(body.owner ?? '').trim()
    const country = String(body.country ?? '').trim()
    if (!owner) return Response.json({ error: '业主/公司名（Owner）为必填项' }, { status: 400 })
    if (!country) return Response.json({ error: '国家（Country）为必填项' }, { status: 400 })

    const site = String(body.site ?? '').trim()
    const region =
      (typeof body.region === 'string' && REGIONS.includes(body.region as never))
        ? body.region
        : getRegionByCountry(country) ?? 'OTHER'

    const exists = await db.customer.findUnique({
      where: { owner_site_country: { owner, site, country } },
    })
    if (exists) {
      return Response.json(
        { error: `客户已存在：${owner} / ${site || '—'} / ${country}` },
        { status: 409 }
      )
    }

    const mills = Array.isArray(body.mills) ? body.mills.map(parseMillInput) : []
    // 经纬度规范化：自动检测并纠正经纬度互换（按国家包围盒判定）
    const lat = typeof body.latitude === 'number' ? body.latitude : null
    const lng = typeof body.longitude === 'number' ? body.longitude : null
    const coords = normalizeLatLng(lat, lng, country)
    const customer = await db.customer.create({
      data: {
        owner,
        site,
        country,
        region,
        status: normalizeStatus(body.status),
        reviewed: body.reviewed || 'NO',
        latitude: coords.latitude,
        longitude: coords.longitude,
        notes: body.notes ? String(body.notes).trim() : null,
        ...(mills.length > 0 ? { mills: { create: mills } } : {}),
      },
      include: { mills: true },
    })
    return Response.json(customer, { status: 201 })
  } catch (e) {
    console.error('POST /api/customers error:', e)
    return Response.json({ error: '新增客户失败' }, { status: 500 })
  }
}

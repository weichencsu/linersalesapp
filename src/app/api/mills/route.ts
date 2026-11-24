import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[, $]/g, ''))
  return isNaN(n) ? null : n
}
function str(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

function parseMillInput(m: Record<string, unknown>) {
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

// POST /api/mills —— 为客户新增磨机
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error
  try {
    const body = await req.json()
    const customerId = parseInt(body.customerId, 10)
    if (isNaN(customerId)) return Response.json({ error: '无效的客户 ID' }, { status: 400 })
    const customer = await db.customer.findUnique({ where: { id: customerId } })
    if (!customer) return Response.json({ error: '客户不存在' }, { status: 404 })

    const mill = await db.mill.create({
      data: { ...parseMillInput(body), customerId },
    })
    return Response.json(mill, { status: 201 })
  } catch (e) {
    console.error('POST /api/mills error:', e)
    return Response.json({ error: '新增磨机失败' }, { status: 500 })
  }
}

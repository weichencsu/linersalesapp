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

// PUT /api/mills/[id] —— 更新磨机
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin()
  if (error) return error
  try {
    const { id } = await params
    const millId = parseInt(id, 10)
    if (isNaN(millId)) return Response.json({ error: '无效的磨机 ID' }, { status: 400 })

    const body = await req.json()
    const diameterLabel = str(body.diameterLabel)
    let diameterFt = num(body.diameterFt)
    if (diameterFt === null && diameterLabel && !/unknown/i.test(diameterLabel)) {
      const match = diameterLabel.match(/(\d+(?:\.\d+)?)/)
      if (match) diameterFt = parseFloat(match[1])
    }

    const mill = await db.mill.update({
      where: { id: millId },
      data: {
        equipment: String(body.equipment ?? ''),
        millNumber: str(body.millNumber),
        diameterLabel,
        diameterFt,
        lengthLabel: str(body.lengthLabel),
        millType: str(body.millType),
        linerType: str(body.linerType),
        linerSize: str(body.linerSize),
        material: str(body.material),
        supplier: str(body.supplier),
        linerMassPerSetKg: num(body.linerMassPerSetKg),
        annualLinerConsumptionKg: num(body.annualLinerConsumptionKg),
        sellPricePerKgUsd: num(body.sellPricePerKgUsd),
        setPriceUsd: num(body.setPriceUsd),
        annualValueUsd: num(body.annualValueUsd),
      },
    })
    return Response.json(mill)
  } catch (e) {
    console.error('PUT /api/mills/[id] error:', e)
    return Response.json({ error: '更新磨机失败' }, { status: 500 })
  }
}

// DELETE /api/mills/[id] —— 删除磨机
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin()
  if (error) return error
  try {
    const { id } = await params
    const millId = parseInt(id, 10)
    if (isNaN(millId)) return Response.json({ error: '无效的磨机 ID' }, { status: 400 })
    await db.mill.delete({ where: { id: millId } })
    return Response.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/mills/[id] error:', e)
    return Response.json({ error: '删除磨机失败' }, { status: 500 })
  }
}

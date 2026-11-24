import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { getRegionByCountry, normalizeLatLng, REGIONS } from '@/lib/regions'
import { normalizeStatus } from '@/lib/normalize'

// PUT /api/customers/[id] —— 更新客户
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin()
  if (error) return error
  try {
    const { id } = await params
    const customerId = parseInt(id, 10)
    if (isNaN(customerId)) return Response.json({ error: '无效的客户 ID' }, { status: 400 })

    const body = await req.json()
    const owner = String(body.owner ?? '').trim()
    const country = String(body.country ?? '').trim()
    if (!owner) return Response.json({ error: '业主/公司名（Owner）为必填项' }, { status: 400 })
    if (!country) return Response.json({ error: '国家（Country）为必填项' }, { status: 400 })
    const site = String(body.site ?? '').trim()

    // 唯一性检查（排除自身）
    const dup = await db.customer.findFirst({
      where: { owner, site, country, id: { not: customerId } },
    })
    if (dup) return Response.json({ error: `客户已存在：${owner} / ${site || '—'} / ${country}` }, { status: 409 })

    const region =
      (typeof body.region === 'string' && REGIONS.includes(body.region as never))
        ? body.region
        : getRegionByCountry(country) ?? 'OTHER'

    // 经纬度规范化：自动检测并纠正经纬度互换（按国家包围盒判定）
    const lat = typeof body.latitude === 'number' ? body.latitude : null
    const lng = typeof body.longitude === 'number' ? body.longitude : null
    const coords = normalizeLatLng(lat, lng, country)

    const customer = await db.customer.update({
      where: { id: customerId },
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
      },
      include: { mills: true },
    })
    return Response.json(customer)
  } catch (e) {
    console.error('PUT /api/customers/[id] error:', e)
    return Response.json({ error: '更新客户失败' }, { status: 500 })
  }
}

// DELETE /api/customers/[id] —— 删除客户（级联删除磨机）
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin()
  if (error) return error
  try {
    const { id } = await params
    const customerId = parseInt(id, 10)
    if (isNaN(customerId)) return Response.json({ error: '无效的客户 ID' }, { status: 400 })
    await db.customer.delete({ where: { id: customerId } })
    return Response.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/customers/[id] error:', e)
    return Response.json({ error: '删除客户失败' }, { status: 500 })
  }
}

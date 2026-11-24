import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, hashPassword, validatePassword } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

/** 目标用户是否为最后一个可用管理员 */
async function isLastActiveAdmin(userId: number): Promise<boolean> {
  const activeAdmins = await db.user.count({ where: { role: 'ADMIN', isActive: true } })
  if (activeAdmins > 1) return false
  const target = await db.user.findUnique({ where: { id: userId } })
  return !!target && target.role === 'ADMIN' && target.isActive
}

// PATCH /api/users/[id] —— 更新用户（仅管理员）
// body: { displayName?, role?, isActive?, password? }
export async function PATCH(req: NextRequest, { params }: Params) {
  const { user: admin, error } = await requireAdmin()
  if (error) return error
  try {
    const { id } = await params
    const userId = parseInt(id, 10)
    if (isNaN(userId)) return Response.json({ error: '无效的用户 ID' }, { status: 400 })

    const target = await db.user.findUnique({ where: { id: userId } })
    if (!target) return Response.json({ error: '用户不存在' }, { status: 404 })

    const body = await req.json()
    const data: Record<string, unknown> = {}

    if (typeof body.displayName === 'string') {
      data.displayName = body.displayName.trim().slice(0, 60)
    }

    const willChangeRole = body.role === 'ADMIN' || body.role === 'USER'
    if (willChangeRole) data.role = body.role
    const willChangeActive = typeof body.isActive === 'boolean'
    if (willChangeActive) data.isActive = body.isActive

    // 不能改动自己的角色 / 启用状态（防止自我锁定）
    if (userId === admin.id && (willChangeRole || willChangeActive)) {
      return Response.json({ error: '不能修改自己的角色或启用状态' }, { status: 400 })
    }

    // 不能降级 / 停用系统中最后一个可用管理员
    const losesAdmin =
      (willChangeRole && body.role !== 'ADMIN' && target.role === 'ADMIN') ||
      (willChangeActive && !body.isActive && target.role === 'ADMIN' && target.isActive)
    if (losesAdmin && (await isLastActiveAdmin(userId))) {
      return Response.json({ error: '系统至少需要保留一名可用的管理员' }, { status: 400 })
    }

    if (typeof body.password === 'string' && body.password !== '') {
      const errP = validatePassword(body.password)
      if (errP) return Response.json({ error: errP }, { status: 400 })
      data.passwordHash = await hashPassword(body.password)
    }

    if (Object.keys(data).length === 0) {
      return Response.json({ error: '没有需要更新的内容' }, { status: 400 })
    }

    const updated = await db.user.update({ where: { id: userId }, data })
    return Response.json({
      id: updated.id,
      username: updated.username,
      displayName: updated.displayName,
      role: updated.role === 'ADMIN' ? 'ADMIN' : 'USER',
      isActive: updated.isActive,
      lastLoginAt: updated.lastLoginAt ? updated.lastLoginAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
    })
  } catch (e) {
    console.error('PATCH /api/users/[id] error:', e)
    return Response.json({ error: '更新用户失败' }, { status: 500 })
  }
}

// DELETE /api/users/[id] —— 删除用户（仅管理员）
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { user: admin, error } = await requireAdmin()
  if (error) return error
  try {
    const { id } = await params
    const userId = parseInt(id, 10)
    if (isNaN(userId)) return Response.json({ error: '无效的用户 ID' }, { status: 400 })

    if (userId === admin.id) {
      return Response.json({ error: '不能删除自己的账号' }, { status: 400 })
    }

    const target = await db.user.findUnique({ where: { id: userId } })
    if (!target) return Response.json({ error: '用户不存在' }, { status: 404 })

    if (target.role === 'ADMIN' && target.isActive && (await isLastActiveAdmin(userId))) {
      return Response.json({ error: '系统至少需要保留一名可用的管理员' }, { status: 400 })
    }

    await db.user.delete({ where: { id: userId } })
    return Response.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/users/[id] error:', e)
    return Response.json({ error: '删除用户失败' }, { status: 500 })
  }
}

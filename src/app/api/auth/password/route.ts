import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireUser, hashPassword, verifyPassword, validatePassword,
} from '@/lib/auth'

// PATCH /api/auth/password —— 修改自己的密码
// body: { currentPassword, newPassword }
export async function PATCH(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error) return error
  try {
    const body = await req.json()
    const currentPassword = String(body.currentPassword ?? '')
    const newPassword = String(body.newPassword ?? '')

    const full = await db.user.findUnique({ where: { id: user.id } })
    if (!full) return Response.json({ error: '用户不存在' }, { status: 404 })

    if (!(await verifyPassword(currentPassword, full.passwordHash))) {
      return Response.json({ error: '当前密码不正确' }, { status: 401 })
    }
    const errP = validatePassword(newPassword)
    if (errP) return Response.json({ error: errP.replace('密码', '新密码') }, { status: 400 })

    const passwordHash = await hashPassword(newPassword)
    await db.user.update({ where: { id: user.id }, data: { passwordHash } })
    return Response.json({ ok: true })
  } catch (e) {
    console.error('PATCH /api/auth/password error:', e)
    return Response.json({ error: '修改密码失败' }, { status: 500 })
  }
}

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createSessionToken, setSessionCookie, type SafeUser } from '@/lib/auth'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function toSafe(u: { id: number; username: string; displayName: string; role: string }): SafeUser {
  return { id: u.id, username: u.username, displayName: u.displayName, role: u.role === 'ADMIN' ? 'ADMIN' : 'USER' }
}

// POST /api/auth/login —— 用户名密码登录，成功后写入会话 Cookie
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const username = String(body.username ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    if (!username || !password) {
      return Response.json({ error: '请输入用户名和密码' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { username } })
    const ok = user ? await verifyPassword(password, user.passwordHash) : false
    // 无论用户不存在还是密码错误，统一提示 + 少量延迟，避免暴力探测
    if (!ok || !user) {
      await sleep(600)
      return Response.json({ error: '用户名或密码错误' }, { status: 401 })
    }
    if (!user.isActive) {
      return Response.json({ error: '该账号已被停用，请联系管理员' }, { status: 403 })
    }

    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    const { token, maxAge } = await createSessionToken(user.id)
    await setSessionCookie(token, maxAge)
    return Response.json({ user: toSafe(user) })
  } catch (e) {
    console.error('POST /api/auth/login error:', e)
    return Response.json({ error: '登录失败，请重试' }, { status: 500 })
  }
}

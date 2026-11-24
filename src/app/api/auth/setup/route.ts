import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  hashPassword, validateUsername, validatePassword, createSessionToken, setSessionCookie, type SafeUser,
} from '@/lib/auth'

// POST /api/auth/setup —— 首次运行初始化：创建第一个管理员账号
// 仅当系统中没有任何用户时可用；创建后自动登录并清理旧版管理密码
export async function POST(req: NextRequest) {
  try {
    const count = await db.user.count()
    if (count > 0) {
      return Response.json({ error: '初始设置已完成，请直接登录' }, { status: 403 })
    }

    const body = await req.json()
    const username = String(body.username ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    const displayName = String(body.displayName ?? '').trim()

    const errU = validateUsername(username)
    if (errU) return Response.json({ error: errU }, { status: 400 })
    const errP = validatePassword(password)
    if (errP) return Response.json({ error: errP }, { status: 400 })

    const passwordHash = await hashPassword(password)
    const user = await db.user.create({
      data: { username, passwordHash, displayName, role: 'ADMIN', isActive: true, lastLoginAt: new Date() },
    })

    // 清理旧版 PIN 管理密码（已由用户体系取代）
    await db.setting.deleteMany({ where: { key: 'adminPin' } })

    const { token, maxAge } = await createSessionToken(user.id)
    await setSessionCookie(token, maxAge)
    const safe: SafeUser = {
      id: user.id, username: user.username, displayName: user.displayName, role: 'ADMIN',
    }
    return Response.json({ user: safe }, { status: 201 })
  } catch (e) {
    console.error('POST /api/auth/setup error:', e)
    return Response.json({ error: '初始化失败，请重试' }, { status: 500 })
  }
}

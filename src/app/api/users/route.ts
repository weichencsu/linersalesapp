import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireAdmin, hashPassword, validateUsername, validatePassword, type SafeUser,
} from '@/lib/auth'

function toSafe(u: { id: number; username: string; displayName: string; role: string; isActive: boolean; lastLoginAt: Date | null; createdAt: Date }): SafeUser & { isActive: boolean; lastLoginAt: string | null; createdAt: string } {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    role: u.role === 'ADMIN' ? 'ADMIN' : 'USER',
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
    createdAt: u.createdAt.toISOString(),
  }
}

// GET /api/users —— 用户列表（仅管理员）
export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error
  try {
    const users = await db.user.findMany({ orderBy: { id: 'asc' } })
    return Response.json(users.map(toSafe))
  } catch (e) {
    console.error('GET /api/users error:', e)
    return Response.json({ error: '读取用户列表失败' }, { status: 500 })
  }
}

// POST /api/users —— 新建用户（仅管理员）
// body: { username, password, displayName?, role? }
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error
  try {
    const body = await req.json()
    const username = String(body.username ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    const displayName = String(body.displayName ?? '').trim()
    const role = body.role === 'ADMIN' ? 'ADMIN' : 'USER'

    const errU = validateUsername(username)
    if (errU) return Response.json({ error: errU }, { status: 400 })
    const errP = validatePassword(password)
    if (errP) return Response.json({ error: errP }, { status: 400 })

    const exists = await db.user.findUnique({ where: { username } })
    if (exists) return Response.json({ error: `用户名已存在：${username}` }, { status: 409 })

    const passwordHash = await hashPassword(password)
    const user = await db.user.create({
      data: { username, passwordHash, displayName, role, isActive: true },
    })
    return Response.json(toSafe(user), { status: 201 })
  } catch (e) {
    console.error('POST /api/users error:', e)
    return Response.json({ error: '创建用户失败' }, { status: 500 })
  }
}

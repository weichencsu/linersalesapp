import { getSessionUser } from '@/lib/auth'

// GET /api/auth/me —— 当前登录用户（未登录返回 401）
export async function GET() {
  const user = await getSessionUser()
  if (!user) return Response.json({ error: '未登录或会话已过期' }, { status: 401 })
  return Response.json({ user })
}

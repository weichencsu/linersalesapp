import { clearSessionCookie } from '@/lib/auth'

// POST /api/auth/logout —— 退出登录，清除会话 Cookie
export async function POST() {
  await clearSessionCookie()
  return Response.json({ ok: true })
}

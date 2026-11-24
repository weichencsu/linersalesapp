import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import AuthPanel from '@/components/app/AuthPanel'

export const dynamic = 'force-dynamic'

// /login —— 登录页（已登录则回首页；系统尚无用户时显示首次初始化界面）
export default async function LoginPage() {
  const user = await getSessionUser()
  if (user) redirect('/')
  const initialized = (await db.user.count()) > 0
  return <AuthPanel initialized={initialized} />
}

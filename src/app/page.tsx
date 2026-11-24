import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import AppShell from '@/components/app/AppShell'

export const dynamic = 'force-dynamic'

// 首页（服务端鉴权）：未登录跳转 /login，已登录渲染应用主框架
export default async function Home() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  return <AppShell user={user} />
}

'use client'

import { useCallback, useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { ThemeToggle } from '@/components/app/ThemeToggle'
import { LanguageToggle } from '@/components/app/LanguageToggle'
import UserMenu from '@/components/app/UserMenu'
import DashboardTab from '@/components/app/DashboardTab'
import MapTab from '@/components/app/MapTab'
import AnalyticsTab from '@/components/app/AnalyticsTab'
import ManageTab from '@/components/app/ManageTab'
import type { AuthUser, Customer } from '@/lib/types'
import { useI18n } from '@/lib/i18n'
import { Factory, LayoutDashboard, Map as MapIcon, PieChart, RefreshCw, Settings2 } from 'lucide-react'

interface Props {
  user: AuthUser
}

// 应用主框架（客户端）：顶部导航 + 四个页签（客户管理仅管理员可见）
export default function AppShell({ user: initialUser }: Props) {
  const { t } = useI18n()
  const [user, setUser] = useState<AuthUser>(initialUser)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('dashboard')
  const [pendingMapFocus, setPendingMapFocus] = useState<{ customerId: number; ts: number } | null>(null)

  const isAdmin = user.role === 'ADMIN'

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/customers')
      if (res.status === 401) {
        // 会话过期 → 回登录页
        window.location.href = '/login'
        return
      }
      if (!res.ok) throw new Error()
      setCustomers(await res.json())
    } catch {
      // 静默处理，界面显示空态
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const viewOnMap = (customerId: number) => {
    setPendingMapFocus({ customerId, ts: Date.now() })
    setTab('map')
  }

  const totalMills = customers.reduce((s, c) => s + c.mills.length, 0)

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* ===== 顶部导航 ===== */}
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 lg:px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
            <Factory className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold leading-tight sm:text-lg">
              {t('nav.title')}
            </h1>
            <p className="truncate text-[11px] text-muted-foreground">
              {t('nav.subtitle')}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="mr-1 hidden text-xs text-muted-foreground md:inline">
              {loading ? t('nav.loading') : t('nav.stats', { c: customers.length, m: totalMills })}
            </span>
            <Button size="icon" variant="ghost" className="h-9 w-9" title={t('nav.refresh')} onClick={reload}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <LanguageToggle />
            <ThemeToggle />
            <div className="mx-1 hidden h-6 w-px bg-border sm:block" />
            <UserMenu user={user} onUserChange={setUser} />
          </div>
        </div>
      </header>

      {/* ===== 主体 ===== */}
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 lg:px-6">
        <Tabs value={tab} onValueChange={setTab} className="gap-5">
          <TabsList className="h-11 w-full justify-start overflow-x-auto rounded-xl p-1">
            <TabsTrigger value="dashboard" className="gap-1.5 px-4 text-sm">
              <LayoutDashboard className="h-4 w-4" />{t('tab.dashboard')}
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-1.5 px-4 text-sm">
              <MapIcon className="h-4 w-4" />{t('tab.map')}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5 px-4 text-sm">
              <PieChart className="h-4 w-4" />{t('tab.analytics')}
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="manage" className="gap-1.5 px-4 text-sm">
                <Settings2 className="h-4 w-4" />{t('tab.manage')}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="dashboard">
            <DashboardTab customers={customers} onViewOnMap={viewOnMap} />
          </TabsContent>
          <TabsContent value="map">
            <MapTab
              customers={customers}
              pendingFocus={pendingMapFocus}
              onFocusConsumed={() => setPendingMapFocus(null)}
            />
          </TabsContent>
          <TabsContent value="analytics">
            <AnalyticsTab customers={customers} />
          </TabsContent>
          {isAdmin && (
            <TabsContent value="manage">
              <ManageTab customers={customers} reload={reload} />
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* ===== 页脚 ===== */}
      <footer className="mt-auto border-t bg-background">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-muted-foreground lg:px-6">
          <span>{t('footer.source')}</span>
          <span>{t('footer.regions')}</span>
        </div>
      </footer>
      <Toaster position="top-center" richColors />
    </div>
  )
}

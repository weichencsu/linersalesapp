'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Factory, Eye, EyeOff, LogIn, ShieldCheck, LayoutDashboard, Map as MapIcon, PieChart, Loader2,
} from 'lucide-react'
import { useI18n, translateServerError } from '@/lib/i18n'
import { ThemeToggle } from './ThemeToggle'
import { LanguageToggle } from './LanguageToggle'

interface Props {
  initialized: boolean // false = 系统尚无用户，显示“创建第一个管理员”
}

// 登录 / 首次初始化 界面（左右分栏：品牌区 + 表单区）
export default function AuthPanel({ initialized }: Props) {
  const { t, lang } = useI18n()
  const router = useRouter()
  const [form, setForm] = useState({ username: '', displayName: '', password: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const set = (patch: Partial<typeof form>) => setForm((p) => ({ ...p, ...patch }))

  const validate = (): string | null => {
    if (!form.username.trim()) return t('auth.usernameRequired')
    if (!form.password) return t('auth.passwordRequired')
    if (!initialized && form.password !== form.confirm) return t('auth.pwMismatch')
    return null
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) return toast.error(err)
    setBusy(true)
    try {
      const endpoint = initialized ? '/api/auth/login' : '/api/auth/setup'
      const payload = initialized
        ? { username: form.username, password: form.password }
        : {
            username: form.username,
            password: form.password,
            displayName: form.displayName,
          }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('auth.loginFailed'))
      toast.success(initialized ? t('auth.welcomeBack') : t('auth.setupDone'))
      // 整页跳转，确保服务端组件读取到新会话 Cookie
      window.location.replace('/')
    } catch (err) {
      toast.error(translateServerError(err instanceof Error ? err.message : t('auth.loginFailed'), lang))
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* ===== 左侧品牌区（小屏隐藏） ===== */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 p-10 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-black/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <Factory className="h-6 w-6" />
          </div>
          <div>
            <div className="text-lg font-bold leading-tight">{t('nav.title')}</div>
            <div className="text-xs text-white/70">{t('nav.subtitle')}</div>
          </div>
        </div>

        <div className="relative space-y-5">
          <h2 className="max-w-md text-3xl font-bold leading-snug">{t('auth.brandHeadline')}</h2>
          <ul className="space-y-3.5 text-sm text-white/85">
            <li className="flex items-start gap-3">
              <LayoutDashboard className="mt-0.5 h-4.5 w-4.5 shrink-0 text-white/70" />
              {t('auth.feature1')}
            </li>
            <li className="flex items-start gap-3">
              <MapIcon className="mt-0.5 h-4.5 w-4.5 shrink-0 text-white/70" />
              {t('auth.feature2')}
            </li>
            <li className="flex items-start gap-3">
              <PieChart className="mt-0.5 h-4.5 w-4.5 shrink-0 text-white/70" />
              {t('auth.feature3')}
            </li>
          </ul>
        </div>

        <div className="relative flex flex-wrap gap-2">
          {['APAC', 'CIS', 'EUR', 'AFR', 'SAM'].map((r) => (
            <span key={r} className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium tracking-wide">
              {r}
            </span>
          ))}
        </div>
      </div>

      {/* ===== 右侧表单区 ===== */}
      <div className="relative flex flex-1 flex-col">
        {/* 右上角：语言 / 主题 */}
        <div className="absolute right-4 top-4 z-10 flex items-center gap-1.5">
          <LanguageToggle />
          <ThemeToggle />
        </div>

        <div className="mx-auto my-auto w-full max-w-md flex-1 px-6 py-10">
          <div className="flex min-h-full flex-col justify-center">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
              <Factory className="h-5 w-5" />
            </div>
            <div className="text-base font-bold">{t('nav.title')}</div>
          </div>

          <div className="rounded-2xl border bg-card p-8 shadow-sm">
            {!initialized ? (
              <>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h1 className="text-xl font-bold">{t('auth.setupTitle')}</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">{t('auth.setupDesc')}</p>
              </>
            ) : (
              <>
                <h1 className="text-xl font-bold">{t('auth.signInTitle')}</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">{t('auth.signInDesc')}</p>
              </>
            )}

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username">{t('auth.username')}</Label>
                <Input
                  id="username"
                  autoComplete="username"
                  autoFocus
                  value={form.username}
                  onChange={(e) => set({ username: e.target.value })}
                  placeholder={t('auth.usernamePh')}
                />
              </div>

              {!initialized && (
                <div className="space-y-1.5">
                  <Label htmlFor="displayName">{t('auth.displayName')}</Label>
                  <Input
                    id="displayName"
                    value={form.displayName}
                    onChange={(e) => set({ displayName: e.target.value })}
                    placeholder={t('auth.displayNamePh')}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete={initialized ? 'current-password' : 'new-password'}
                    value={form.password}
                    onChange={(e) => set({ password: e.target.value })}
                    placeholder={t('auth.passwordPh')}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {!initialized && (
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">{t('auth.confirmPassword')}</Label>
                  <Input
                    id="confirm"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={form.confirm}
                    onChange={(e) => set({ confirm: e.target.value })}
                    placeholder={t('auth.confirmPassword')}
                  />
                  <p className="text-xs text-muted-foreground">{t('auth.passwordHint')}</p>
                </div>
              )}

              <Button type="submit" className="w-full gap-2" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                {busy
                  ? (initialized ? t('auth.signingIn') : t('auth.settingUp'))
                  : (initialized ? t('auth.signIn') : t('auth.setupBtn'))}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">{t('auth.localNote')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

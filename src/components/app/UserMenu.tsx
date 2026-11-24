'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { KeyRound, LogOut, Users, ShieldCheck, User } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { AuthUser } from '@/lib/types'
import ChangePasswordDialog from './ChangePasswordDialog'
import UserManagementDialog from './UserManagementDialog'

interface Props {
  user: AuthUser
  onUserChange: (u: AuthUser) => void // 自身资料变化时同步（如显示名）
}

function initialsOf(user: AuthUser): string {
  const src = (user.displayName || user.username).trim()
  const parts = src.split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return src.slice(0, 2).toUpperCase()
}

// 顶部导航右侧的用户菜单：资料 / 修改密码 / 用户管理（管理员）/ 退出登录
export default function UserMenu({ user, onUserChange }: Props) {
  const { t } = useI18n()
  const [pwOpen, setPwOpen] = useState(false)
  const [umOpen, setUmOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const signOut = async () => {
    setSigningOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      toast.success(t('user.signedOut'))
      window.location.href = '/login'
    } catch {
      toast.error(t('auth.loginFailed'))
      setSigningOut(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex h-9 items-center gap-2 rounded-full border bg-background pl-1 pr-2.5 transition-colors hover:bg-accent"
            title={user.username}
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-teal-700 text-[11px] font-bold text-white">
                {initialsOf(user)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden max-w-[120px] truncate text-sm font-medium sm:inline">
              {user.displayName || user.username}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>
            <div className="flex items-center gap-2.5">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-teal-700 text-xs font-bold text-white">
                  {initialsOf(user)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{user.displayName || user.username}</div>
                <div className="truncate text-xs font-normal text-muted-foreground">@{user.username}</div>
              </div>
            </div>
            <div className="mt-2">
              <Badge
                variant="outline"
                className={cn(
                  'gap-1 whitespace-nowrap font-medium',
                  user.role === 'ADMIN'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300'
                )}
              >
                {user.role === 'ADMIN' ? <ShieldCheck className="h-3 w-3" /> : <User className="h-3 w-3" />}
                {user.role === 'ADMIN' ? t('user.role.admin') : t('user.role.user')}
              </Badge>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setPwOpen(true)} className="gap-2">
            <KeyRound className="h-4 w-4" />{t('user.changePassword')}
          </DropdownMenuItem>
          {user.role === 'ADMIN' && (
            <DropdownMenuItem onClick={() => setUmOpen(true)} className="gap-2">
              <Users className="h-4 w-4" />{t('user.userManagement')}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} disabled={signingOut} className="gap-2 text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4" />{t('user.signOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
      <UserManagementDialog
        open={umOpen}
        onOpenChange={setUmOpen}
        currentUser={user}
        onCurrentUserChange={onUserChange}
      />
    </>
  )
}

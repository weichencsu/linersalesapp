'use client'

import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const { t } = useI18n()
  return (
    <Button
      size="icon"
      variant="ghost"
      className="h-9 w-9"
      title={resolvedTheme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
      <span className="sr-only">{t('theme.toggle')}</span>
    </Button>
  )
}

'use client'

import { useI18n, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Languages } from 'lucide-react'

/** EN / 中文 语言切换（分段按钮，选择持久化于 localStorage） */
export function LanguageToggle() {
  const { lang, setLang, t } = useI18n()

  const options: { id: Lang; label: string }[] = [
    { id: 'en', label: 'EN' },
    { id: 'zh', label: '中文' },
  ]

  return (
    <div
      className="flex h-9 items-center rounded-lg border bg-background p-0.5"
      title={t('lang.toggle')}
      role="group"
      aria-label={t('lang.toggle')}
    >
      <Languages className="mx-1 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => setLang(o.id)}
          aria-pressed={lang === o.id}
          className={cn(
            'rounded-md px-1.5 py-0.5 text-xs font-medium transition-colors',
            lang === o.id
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

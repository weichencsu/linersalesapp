import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'

// ============================================================
// SQLite 数据库路径解析（跨平台 / 开发与 standalone 运行通用）
// 优先级：.env 中的绝对路径 → 相对 cwd 解析 → 标准位置搜索
// 背景：.env 若为相对路径，Prisma CLI 按 schema 所在目录解析，
// 而运行时（next dev / standalone server）的 cwd 各不相同，
// 此处在实例化客户端前统一为绝对路径，保证任何环境都指向同一个库文件。
// ============================================================
function resolveDbUrl(): string {
  const raw = process.env.DATABASE_URL?.trim()
  const candidates: string[] = []

  if (raw?.startsWith('file:')) {
    const p = raw.slice(5)
    if (/^([a-zA-Z]:[\\/]|\/)/.test(p)) {
      candidates.push(p) // 绝对路径：按原样使用
    } else {
      candidates.push(resolve(process.cwd(), p)) // 相对路径：按 cwd 解析
    }
  }

  // 标准位置回退（dev: cwd=项目根；standalone: cwd=.next/standalone，向上回溯）
  candidates.push(resolve(process.cwd(), 'db', 'custom.db'))
  candidates.push(resolve(process.cwd(), '..', 'db', 'custom.db'))
  candidates.push(resolve(process.cwd(), '..', '..', 'db', 'custom.db'))

  for (const c of candidates) {
    if (existsSync(c)) return 'file:' + c
  }
  // 全部不存在（首次初始化）：落在项目根 db/custom.db
  return 'file:' + candidates[candidates.length - 1]
}

process.env.DATABASE_URL = resolveDbUrl()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

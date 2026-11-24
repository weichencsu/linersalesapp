// 跨平台的 prisma db push 包装脚本：
// 显式将 DATABASE_URL 指向项目根下的 db/custom.db（绝对路径），
// 避免 .env 中的相对路径被 Prisma CLI 按 schema 目录解析到错误位置。
// 用法: npm run db:push   （等效 prisma db push + prisma generate）
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const dbDir = resolve(root, 'db')
const dbPath = resolve(dbDir, 'custom.db')

if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true })

const env = { ...process.env, DATABASE_URL: 'file:' + dbPath }

console.log(`[db:push] SQLite file: ${dbPath}`)
execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', env, cwd: root })
execSync('npx prisma generate', { stdio: 'inherit', env, cwd: root })

// ============================================================
// Render 启动前数据库准备脚本（由 render.yaml 的 startCommand 调用）
// ------------------------------------------------------------
// 背景：Render 的持久磁盘只在运行时挂载，构建阶段无法访问（官方限制），
// 因此首次启动时 /data/custom.db 尚不存在。本脚本在服务启动前初始化：
//   1. 目标数据库文件已存在 → 不做任何改动（保护线上数据，幂等）；
//   2. 不存在 → 复制仓库内置种子数据库 db/custom.db 作为初始数据
//      （含 42 个客户、132 台磨机；用户表为空，首次访问网页会引导
//       创建第一个管理员账号）；
//   3. 种子文件也缺失 → 用 prisma db push 创建空库（仅表结构）。
// 失败时（如免费实例无磁盘挂载）仅警告不中断，应用会回退到
// 代码库内置数据库运行（数据不持久）。
// ============================================================
import { execSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const root = process.cwd()
const raw = process.env.DATABASE_URL?.trim() ?? ''
const seed = resolve(root, 'db', 'custom.db')

if (!raw.startsWith('file:')) {
  console.warn(
    '[render-prepare-db] DATABASE_URL 未设置为 file: 形式，跳过初始化' +
    '（应用将回退到代码库内置数据库，数据不持久）'
  )
  process.exit(0)
}

const target = raw.slice(5)

try {
  if (existsSync(target)) {
    console.log(`[render-prepare-db] 数据库已就绪：${target}`)
    process.exit(0)
  }

  mkdirSync(dirname(target), { recursive: true })

  if (existsSync(seed)) {
    copyFileSync(seed, target)
    console.log(`[render-prepare-db] 首次启动：已从种子数据库初始化 ${target}`)
    console.log('[render-prepare-db] 首次访问网页时会引导创建第一个管理员账号')
  } else {
    // 极端情况（种子数据库未入库）：仅创建表结构空库
    execSync('npx prisma db push --skip-generate --accept-data-loss', { stdio: 'inherit' })
    console.warn(`[render-prepare-db] 未找到种子数据库 ${seed}，已创建空库 ${target}`)
  }
} catch (e) {
  console.warn(`[render-prepare-db] 初始化 ${target} 失败：${e.message}`)
  console.warn('[render-prepare-db] 应用将回退到代码库内置数据库运行（数据不持久）')
}

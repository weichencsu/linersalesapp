// 构建后处理：将静态资源复制到 standalone 目录（Windows / macOS / Linux 通用）
// Post-build step: copy static assets into the standalone build (cross-platform).
import { cpSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const standalone = join(root, '.next', 'standalone')

if (!existsSync(standalone)) {
  console.error('[postbuild] Standalone build not found — run "next build" first.')
  process.exit(1)
}

cpSync(join(root, '.next', 'static'), join(standalone, '.next', 'static'), { recursive: true })
if (existsSync(join(root, 'public'))) {
  cpSync(join(root, 'public'), join(standalone, 'public'), { recursive: true })
}
console.log('[postbuild] Static assets copied into .next/standalone.')

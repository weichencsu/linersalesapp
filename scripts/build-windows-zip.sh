#!/bin/bash
# 打包 Windows 交付版 zip：源码 + 数据 + 指南（不含 node_modules/.next/download 等）
set -e
cd /home/z/my-project

OUT=download/mill-liners-app-windows.zip
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT

mkdir -p "$STAGE/mill-liners-app"

# ---- 源码与配置 ----
cp -r src public prisma data scripts "$STAGE/mill-liners-app/"
mkdir -p "$STAGE/mill-liners-app/db"
cp db/custom.db "$STAGE/mill-liners-app/db/custom.db"
cp package.json components.json eslint.config.mjs next.config.ts postcss.config.mjs tailwind.config.ts tsconfig.json README.md .gitignore "$STAGE/mill-liners-app/"
cp next-env.d.ts "$STAGE/mill-liners-app/" 2>/dev/null || true

# ---- .env：相对路径（db.ts 运行时解析器会按 cwd 定位，跨平台安全）----
printf 'DATABASE_URL=file:db/custom.db\n' > "$STAGE/mill-liners-app/.env"

# ---- 清理打包内不需要的内容 ----
rm -rf "$STAGE/mill-liners-app/scripts/docx" "$STAGE/mill-liners-app/scripts/"*.py "$STAGE/mill-liners-app/scripts/migrate_regions.ts"

# ---- 打包 ----
rm -f "$OUT"
(cd "$STAGE" && zip -qr mill-liners-app.zip mill-liners-app)
mv "$STAGE/mill-liners-app.zip" "$OUT"

echo "=== $OUT built ==="
unzip -l "$OUT" | tail -3
echo "--- new auth files included: ---"
unzip -l "$OUT" | grep -E "auth/|users/|login/|AppShell|AuthPanel|UserMenu|UserManagement|ChangePassword|db-push" | awk '{print $4}'
echo "--- .env content: ---"
unzip -p "$OUT" mill-liners-app/.env

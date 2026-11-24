// ============================================================
// 用户名/密码访问控制（基础认证模块）
// - 密码哈希：Node 内置 crypto.scrypt（无原生依赖，Windows 友好）
// - 会话：HMAC-SHA256 签名令牌，存于 httpOnly Cookie（7 天有效）
// - 密钥：首次使用时自动生成并保存于 Setting 表（key: sessionSecret）
// - 权限：ADMIN（完整权限）| USER（只读浏览）
// ============================================================
import { createHmac, randomBytes, scrypt as _scrypt, timingSafeEqual } from 'crypto'
import { promisify } from 'util'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'

const scryptAsync = promisify(_scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number }
) => Promise<Buffer>

export const SESSION_COOKIE = 'mill_session'
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 天

export type Role = 'ADMIN' | 'USER'

/** 前端可安全使用的用户信息（不含密码哈希） */
export interface SafeUser {
  id: number
  username: string
  displayName: string
  role: Role
}

// ---------------- 密码哈希 ----------------

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 }

/** 生成密码哈希：scrypt:N:r:p:salt(32hex):hash(128hex) */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const hash = await scryptAsync(password, salt, 64, SCRYPT_PARAMS)
  const { N, r, p } = SCRYPT_PARAMS
  return `scrypt:${N}:${r}:${p}:${salt.toString('hex')}:${hash.toString('hex')}`
}

/** 校验密码（按存储串中的参数重新计算，常数时间比较） */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const parts = String(stored ?? '').split(':')
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false
    const N = parseInt(parts[1], 10)
    const r = parseInt(parts[2], 10)
    const p = parseInt(parts[3], 10)
    if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false
    const salt = Buffer.from(parts[4], 'hex')
    const expected = Buffer.from(parts[5], 'hex')
    if (salt.length === 0 || expected.length === 0) return false
    const actual = await scryptAsync(password, salt, expected.length, { N, r, p })
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

// ---------------- 输入校验 ----------------

/** 返回错误消息（中文，客户端会按语言翻译）；合法返回 null */
export function validateUsername(name: string): string | null {
  const u = String(name ?? '').trim()
  if (u.length < 2 || u.length > 30) return '用户名需为 2-30 个字符'
  if (/\s/.test(u)) return '用户名不能包含空格'
  return null
}

export function validatePassword(pw: string): string | null {
  const p = String(pw ?? '')
  if (p.length < 6) return '密码至少需要 6 个字符'
  if (p.length > 128) return '密码过长（最多 128 个字符）'
  return null
}

// ---------------- 会话令牌 ----------------

/** 读取（不存在则生成）会话签名密钥 */
async function getSessionSecret(): Promise<string> {
  const existing = await db.setting.findUnique({ where: { key: 'sessionSecret' } })
  if (existing?.value) return existing.value
  const secret = randomBytes(48).toString('hex')
  try {
    await db.setting.create({ data: { key: 'sessionSecret', value: secret } })
    return secret
  } catch {
    // 并发竞争时重读
    const again = await db.setting.findUnique({ where: { key: 'sessionSecret' } })
    if (again?.value) return again.value
    throw new Error('无法初始化会话密钥')
  }
}

function hmacSign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

function safeEqualStr(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

/** 为用户签发会话令牌（uid.exp.signature，base64url 字符集内无 '.'） */
export async function createSessionToken(userId: number): Promise<{ token: string; maxAge: number }> {
  const secret = await getSessionSecret()
  const exp = Date.now() + SESSION_TTL_SECONDS * 1000
  const payload = `${userId}.${exp}`
  return { token: `${payload}.${hmacSign(payload, secret)}`, maxAge: SESSION_TTL_SECONDS }
}

/** 校验令牌，返回用户 ID；无效/过期返回 null */
async function verifySessionToken(raw: string | undefined): Promise<number | null> {
  if (!raw) return null
  const parts = raw.split('.')
  if (parts.length !== 3) return null
  const [uidS, expS, sig] = parts
  const uid = Number(uidS)
  const exp = Number(expS)
  if (!Number.isInteger(uid) || !Number.isFinite(exp)) return null
  if (Date.now() > exp) return null
  try {
    const secret = await getSessionSecret()
    if (!safeEqualStr(sig, hmacSign(`${uidS}.${expS}`, secret))) return null
    return uid
  } catch {
    return null
  }
}

/** 写入会话 Cookie（httpOnly；本地部署无需 secure） */
export async function setSessionCookie(token: string, maxAge: number): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge,
  })
}

/** 清除会话 Cookie */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 })
}

/** 获取当前登录用户（服务端组件与 API 路由通用）；未登录/被停用返回 null */
export async function getSessionUser(): Promise<SafeUser | null> {
  const store = await cookies()
  const uid = await verifySessionToken(store.get(SESSION_COOKIE)?.value)
  if (uid === null) return null
  const user = await db.user.findUnique({ where: { id: uid } })
  if (!user || !user.isActive) return null
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role === 'ADMIN' ? 'ADMIN' : 'USER',
  }
}

// ---------------- API 路由守卫 ----------------

export function unauthorized() {
  return Response.json({ error: '未登录或会话已过期，请重新登录' }, { status: 401 })
}

export function forbidden() {
  return Response.json({ error: '需要管理员权限' }, { status: 403 })
}

/** 要求已登录（任意角色） */
export async function requireUser(): Promise<{ user: SafeUser; error: null } | { user: null; error: Response }> {
  const user = await getSessionUser()
  if (!user) return { user: null, error: unauthorized() }
  return { user, error: null }
}

/** 要求管理员 */
export async function requireAdmin(): Promise<{ user: SafeUser; error: null } | { user: null; error: Response }> {
  const user = await getSessionUser()
  if (!user) return { user: null, error: unauthorized() }
  if (user.role !== 'ADMIN') return { user: null, error: forbidden() }
  return { user, error: null }
}

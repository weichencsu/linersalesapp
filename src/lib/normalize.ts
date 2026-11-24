// 状态值规范化：统一客户状态口径
// 数据源 Excel（revB）使用 "Existing Customer"（现有客户），
// 旧版本应用使用 "Current Customer" —— 二者含义相同，统一为前者。
export const STATUS_EXISTING = 'Existing Customer'
export const STATUS_POTENTIAL = 'Potential Customer'

/** 规范化客户状态：兼容 Current/Existing 两种写法，未知值原样保留（首字母大写） */
export function normalizeStatus(v: unknown): string {
  const s = String(v ?? '').trim()
  if (!s) return STATUS_POTENTIAL
  if (/^current customer$/i.test(s) || /^existing customer$/i.test(s)) return STATUS_EXISTING
  if (/^potential customer$/i.test(s)) return STATUS_POTENTIAL
  return s
}

/** 判断是否为现有客户（兼容旧值 Current Customer） */
export function isExistingCustomer(status: string): boolean {
  const s = String(status ?? '').trim().toLowerCase()
  return s === 'existing customer' || s === 'current customer'
}

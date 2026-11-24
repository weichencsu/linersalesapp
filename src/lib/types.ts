// 客户与磨机的客户端类型（与 API JSON 对齐）
import type { Role } from './auth'

/** 当前登录用户（客户端安全形态，不含密码） */
export interface AuthUser {
  id: number
  username: string
  displayName: string
  role: Role
}

/** 用户管理列表项 */
export interface ManagedUser extends AuthUser {
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

export interface Mill {
  id: number
  customerId: number
  equipment: string
  millNumber: string | null
  diameterLabel: string | null
  diameterFt: number | null
  lengthLabel: string | null
  millType: string | null
  linerType: string | null
  linerSize: string | null
  material: string | null
  supplier: string | null
  linerMassPerSetKg: number | null
  annualLinerConsumptionKg: number | null
  sellPricePerKgUsd: number | null
  setPriceUsd: number | null
  annualValueUsd: number | null
  createdAt: string
  updatedAt: string
}

export interface Customer {
  id: number
  owner: string
  site: string
  country: string
  region: string
  status: string
  reviewed: string
  latitude: number | null
  longitude: number | null
  notes: string | null
  createdAt: string
  updatedAt: string
  mills: Mill[]
}

/** 客户级汇总字段 */
export interface CustomerWithStats extends Customer {
  millCount: number
  totalSetValueUsd: number | null
  totalAnnualValueUsd: number | null
  millTypes: string[]
}

export function withStats(c: Customer): CustomerWithStats {
  const mills = c.mills ?? []
  return {
    ...c,
    millCount: mills.length,
    totalSetValueUsd: mills.some((m) => m.setPriceUsd !== null)
      ? mills.reduce((s, m) => s + (m.setPriceUsd ?? 0), 0)
      : null,
    totalAnnualValueUsd: mills.some((m) => m.annualValueUsd !== null)
      ? mills.reduce((s, m) => s + (m.annualValueUsd ?? 0), 0)
      : null,
    millTypes: [...new Set(mills.map((m) => m.millType).filter(Boolean))] as string[],
  }
}

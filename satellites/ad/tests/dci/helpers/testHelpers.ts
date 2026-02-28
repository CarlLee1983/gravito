import type { PlanetCore } from '@gravito/core'
import { AdStatus, Advertisement } from '../../../src/Domain/Entities/Advertisement'
import { AdSchedule } from '../../../src/Domain/ValueObjects/AdSchedule'
import { AdWeight } from '../../../src/Domain/ValueObjects/AdWeight'
import { SlotSlug } from '../../../src/Domain/ValueObjects/SlotSlug'

/**
 * 從現在起 N 天後的日期
 */
export function daysFromNow(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

/**
 * N 天前的日期
 */
export function daysAgo(days: number): Date {
  return daysFromNow(-days)
}

/**
 * 建立測試用廣告
 */
export function createTestAd(
  overrides?: Partial<{
    id: string
    slotSlug: SlotSlug
    title: string
    imageUrl: string
    targetUrl: string
    weight: AdWeight
    schedule: AdSchedule
    status: AdStatus
  }>
): Advertisement {
  const id = overrides?.id ?? 'ad-001'
  const slotSlug = overrides?.slotSlug ?? SlotSlug.of('HOME_HERO')
  const title = overrides?.title ?? '測試廣告'
  const imageUrl = overrides?.imageUrl ?? 'https://example.com/image.jpg'
  const targetUrl = overrides?.targetUrl ?? 'https://example.com/landing'
  const weight = overrides?.weight ?? AdWeight.of(5)
  const schedule = overrides?.schedule ?? AdSchedule.of(daysAgo(1), daysFromNow(30))

  // 如果需要特定狀態，使用 reconstitute
  if (overrides?.status && overrides.status !== AdStatus.DRAFT) {
    return Advertisement.reconstitute(id, {
      slotSlug,
      title,
      imageUrl,
      targetUrl,
      weight,
      status: overrides.status,
      schedule,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  return Advertisement.create(id, slotSlug, title, imageUrl, targetUrl, weight, schedule)
}

/**
 * Hook 呼叫記錄
 */
export interface HookCall {
  name: string
  data: unknown
}

/**
 * 建立 Mock PlanetCore（含 hook 追蹤）
 */
export function createMockCore(): {
  core: PlanetCore
  hookCalls: HookCall[]
} {
  const hookCalls: HookCall[] = []

  const core = {
    hooks: {
      doAction: async (name: string, data: unknown) => {
        hookCalls.push({ name, data })
      },
    },
  } as unknown as PlanetCore

  return { core, hookCalls }
}

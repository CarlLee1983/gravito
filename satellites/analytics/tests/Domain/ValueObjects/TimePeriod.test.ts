import { describe, expect, it } from 'vitest'
import { AnalyticsError } from '../../../src/Application/Errors/AnalyticsError'
import { TimePeriod } from '../../../src/Domain/ValueObjects/TimePeriod'

describe('TimePeriod', () => {
  it('fromPreset("24h") 建立過去 24 小時', () => {
    const period = TimePeriod.fromPreset('24h')
    const duration = period.endDate.getTime() - period.startDate.getTime()
    expect(duration).toBeLessThanOrEqual(86400000)
    expect(duration).toBeGreaterThan(86400000 - 1000)
  })

  it('fromPreset("7d") 建立過去 7 天', () => {
    const period = TimePeriod.fromPreset('7d')
    expect(period.durationDays).toBeLessThanOrEqual(7)
    expect(period.durationDays).toBeGreaterThanOrEqual(6)
  })

  it('fromPreset("30d") 建立過去 30 天', () => {
    const period = TimePeriod.fromPreset('30d')
    expect(period.durationDays).toBeLessThanOrEqual(30)
    expect(period.durationDays).toBeGreaterThanOrEqual(29)
  })

  it('fromPreset() 記錄 preset', () => {
    const period = TimePeriod.fromPreset('7d')
    expect(period.preset).toBe('7d')
  })

  it('ofRange() 建立自定義範圍', () => {
    const start = new Date('2026-02-01')
    const end = new Date('2026-02-28')
    const period = TimePeriod.ofRange(start, end)
    expect(period.startDate).toEqual(start)
    expect(period.endDate).toEqual(end)
    expect(period.preset).toBeNull()
  })

  it('ofRange() throws 當 start > end', () => {
    const start = new Date('2026-02-28')
    const end = new Date('2026-02-01')
    expect(() => TimePeriod.ofRange(start, end)).toThrow(AnalyticsError)
  })

  it('durationMs 計算時間差（毫秒）', () => {
    const start = new Date('2026-02-01T00:00:00Z')
    const end = new Date('2026-02-02T00:00:00Z')
    const period = TimePeriod.ofRange(start, end)
    expect(period.durationMs).toBe(86400000)
  })

  it('durationDays 計算時間差（天數）', () => {
    const start = new Date('2026-02-01')
    const end = new Date('2026-02-08')
    const period = TimePeriod.ofRange(start, end)
    expect(period.durationDays).toBe(7)
  })

  it('contains() 判斷日期是否在範圍內', () => {
    const start = new Date('2026-02-01')
    const end = new Date('2026-02-28')
    const period = TimePeriod.ofRange(start, end)
    expect(period.contains(new Date('2026-02-15'))).toBe(true)
    expect(period.contains(new Date('2026-01-31'))).toBe(false)
    expect(period.contains(new Date('2026-03-01'))).toBe(false)
  })

  it('contains() 邊界條件', () => {
    const start = new Date('2026-02-01')
    const end = new Date('2026-02-28')
    const period = TimePeriod.ofRange(start, end)
    expect(period.contains(start)).toBe(true)
    expect(period.contains(end)).toBe(true)
  })

  it('overlaps() 判斷兩個區間是否重疊', () => {
    const p1 = TimePeriod.ofRange(new Date('2026-02-01'), new Date('2026-02-15'))
    const p2 = TimePeriod.ofRange(new Date('2026-02-10'), new Date('2026-02-28'))
    const p3 = TimePeriod.ofRange(new Date('2026-03-01'), new Date('2026-03-31'))
    expect(p1.overlaps(p2)).toBe(true)
    expect(p1.overlaps(p3)).toBe(false)
  })

  it('equals() 判斷相等', () => {
    const start = new Date('2026-02-01')
    const end = new Date('2026-02-28')
    const p1 = TimePeriod.ofRange(start, end)
    const p2 = TimePeriod.ofRange(new Date(start), new Date(end))
    const p3 = TimePeriod.ofRange(new Date('2026-02-02'), new Date('2026-02-28'))
    expect(p1.equals(p2)).toBe(true)
    expect(p1.equals(p3)).toBe(false)
  })

  it('startDate 和 endDate 返回防禦性拷貝', () => {
    const original = new Date('2026-02-01')
    const period = TimePeriod.ofRange(original, new Date('2026-02-28'))
    const retrieved = period.startDate
    retrieved.setDate(15)
    expect(period.startDate.getDate()).toBe(1)
  })

  it('toString() 格式', () => {
    const period = TimePeriod.fromPreset('7d')
    expect(period.toString()).toBe('7d')
  })

  it('toString() 自定義範圍格式', () => {
    const period = TimePeriod.ofRange(new Date('2026-02-01'), new Date('2026-02-28'))
    expect(period.toString()).toContain('2026-02-01')
    expect(period.toString()).toContain('2026-02-28')
  })
})

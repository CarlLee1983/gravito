import { describe, expect, it } from 'bun:test'
import { AnalyticsError } from '../../../src/Application/Errors/AnalyticsError'
import { Period } from '../../../src/Domain/ValueObjects/Period'

describe('Period ValueObject', () => {
  it('應該接受 24h 期間', () => {
    const period = Period.of('24h')

    expect(period.value).toBe('24h')
  })

  it('應該接受 7d 期間', () => {
    const period = Period.of('7d')

    expect(period.value).toBe('7d')
  })

  it('應該接受 30d 期間', () => {
    const period = Period.of('30d')

    expect(period.value).toBe('30d')
  })

  it('應該接受 90d 期間', () => {
    const period = Period.of('90d')

    expect(period.value).toBe('90d')
  })

  it('應該在未提供值時預設為 7d', () => {
    const period = Period.of()

    expect(period.value).toBe('7d')
  })

  it('應該拒絕無效的期間', () => {
    expect(() => {
      Period.of('14d')
    }).toThrow(AnalyticsError)
  })

  it('應該正確轉換為毫秒 - 24h', () => {
    const period = Period.of('24h')
    const ms = period.toMilliseconds()

    expect(ms).toBe(24 * 60 * 60 * 1000)
  })

  it('應該正確轉換為毫秒 - 7d', () => {
    const period = Period.of('7d')
    const ms = period.toMilliseconds()

    expect(ms).toBe(7 * 24 * 60 * 60 * 1000)
  })

  it('應該正確轉換為毫秒 - 30d', () => {
    const period = Period.of('30d')
    const ms = period.toMilliseconds()

    expect(ms).toBe(30 * 24 * 60 * 60 * 1000)
  })

  it('應該正確轉換為毫秒 - 90d', () => {
    const period = Period.of('90d')
    const ms = period.toMilliseconds()

    expect(ms).toBe(90 * 24 * 60 * 60 * 1000)
  })

  it('兩個相同值的 Period 應該相等', () => {
    const p1 = Period.of('7d')
    const p2 = Period.of('7d')

    expect(p1.equals(p2)).toBe(true)
  })
})

import { describe, expect, it } from 'bun:test'
import { SimpleCronParser } from '../src/SimpleCronParser'

describe('SimpleCronParser', () => {
  it('matches wildcard * * * * *', () => {
    const date = new Date('2023-01-01T12:00:00Z')
    expect(SimpleCronParser.isDue('* * * * *', 'UTC', date)).toBe(true)
  })

  it('matches exact values', () => {
    // 2023-01-01 is Sunday (0)
    const date = new Date('2023-01-01T14:30:00Z')

    // Minute 30, Hour 14, DOM 1, Month 1, DOW 0
    expect(SimpleCronParser.isDue('30 14 1 1 0', 'UTC', date)).toBe(true)

    // Wrong minute
    expect(SimpleCronParser.isDue('29 14 1 1 0', 'UTC', date)).toBe(false)
  })

  it('matches lists 1,2,3', () => {
    const date = new Date('2023-01-01T14:30:00Z')
    // Minute 30 included in 0,15,30,45
    expect(SimpleCronParser.isDue('0,15,30,45 * * * *', 'UTC', date)).toBe(true)
    expect(SimpleCronParser.isDue('0,15,45 * * * *', 'UTC', date)).toBe(false)
  })

  it('matches ranges 1-5', () => {
    const date = new Date('2023-01-01T14:30:00Z') // Hour 14
    expect(SimpleCronParser.isDue('* 10-15 * * *', 'UTC', date)).toBe(true)
    expect(SimpleCronParser.isDue('* 15-20 * * *', 'UTC', date)).toBe(false)
  })

  it('matches steps */5', () => {
    const date = new Date('2023-01-01T14:30:00Z') // Minute 30
    expect(SimpleCronParser.isDue('*/5 * * * *', 'UTC', date)).toBe(true)
    expect(SimpleCronParser.isDue('*/10 * * * *', 'UTC', date)).toBe(true)
    expect(SimpleCronParser.isDue('*/7 * * * *', 'UTC', date)).toBe(false) // 30 % 7 != 0
  })

  it('matches range with step 10-20/2', () => {
    const date = new Date('2023-01-01T14:14:00Z') // Minute 14
    expect(SimpleCronParser.isDue('10-20/2 * * * *', 'UTC', date)).toBe(true)

    const date2 = new Date('2023-01-01T14:15:00Z') // Minute 15 (odd, not match /2 starting from 10)
    expect(SimpleCronParser.isDue('10-20/2 * * * *', 'UTC', date2)).toBe(false)
  })

  it('handles timezone', () => {
    // 12:00 UTC = 20:00 Taipei
    const date = new Date('2023-01-01T12:00:00Z')

    // Should match hour 20 in Taipei
    expect(SimpleCronParser.isDue('* 20 * * *', 'Asia/Taipei', date)).toBe(true)

    // Should NOT match hour 12 in Taipei
    expect(SimpleCronParser.isDue('* 12 * * *', 'Asia/Taipei', date)).toBe(false)
  })

  it('Sunday as 0 and 7', () => {
    const date = new Date('2023-01-01T12:00:00Z') // Sunday
    expect(SimpleCronParser.isDue('* * * * 0', 'UTC', date)).toBe(true)
    expect(SimpleCronParser.isDue('* * * * 7', 'UTC', date)).toBe(true)
  })
})

import { beforeEach, describe, expect, test } from 'bun:test'
import { LockManager } from '../src/locks/LockManager'
import { SchedulerManager } from '../src/SchedulerManager'

describe('P1: Time Validation Fixes', () => {
  let scheduler: SchedulerManager

  beforeEach(() => {
    const lockManager = new LockManager('memory')
    scheduler = new SchedulerManager(lockManager)
  })

  describe('TaskSchedule.at() validation (P1-01)', () => {
    test('should accept valid time formats', () => {
      const schedule = scheduler.task('test', () => {})

      expect(() => schedule.daily().at('00:00')).not.toThrow()
      expect(() => schedule.daily().at('23:59')).not.toThrow()
      expect(() => schedule.daily().at('12:30')).not.toThrow()
      expect(() => schedule.daily().at('09:15')).not.toThrow()
    })

    test('should reject invalid time formats', () => {
      expect(() => {
        scheduler
          .task('test1', () => {})
          .daily()
          .at('25:00')
      }).toThrow(/Invalid time format/)

      expect(() => {
        scheduler
          .task('test2', () => {})
          .daily()
          .at('12:60')
      }).toThrow(/Invalid time format/)

      expect(() => {
        scheduler
          .task('test3', () => {})
          .daily()
          .at('invalid')
      }).toThrow(/Invalid time format/)

      expect(() => {
        scheduler
          .task('test4', () => {})
          .daily()
          .at('')
      }).toThrow(/Invalid time format/)

      expect(() => {
        scheduler
          .task('test5', () => {})
          .daily()
          .at('1:30')
      }).toThrow(/Invalid time format/)

      expect(() => {
        scheduler
          .task('test6', () => {})
          .daily()
          .at('12:5')
      }).toThrow(/Invalid time format/)
    })

    test('should generate correct cron expression for valid times', () => {
      const task1 = scheduler
        .task('test1', () => {})
        .daily()
        .at('14:30')
      expect(task1.getTask().expression).toBe('30 14 * * *')

      const task2 = scheduler
        .task('test2', () => {})
        .daily()
        .at('00:00')
      expect(task2.getTask().expression).toBe('0 0 * * *')

      const task3 = scheduler
        .task('test3', () => {})
        .daily()
        .at('23:59')
      expect(task3.getTask().expression).toBe('59 23 * * *')
    })
  })

  describe('hourlyAt() validation (P1-03)', () => {
    test('should accept valid minute values (0-59)', () => {
      expect(() => scheduler.task('test1', () => {}).hourlyAt(0)).not.toThrow()
      expect(() => scheduler.task('test2', () => {}).hourlyAt(30)).not.toThrow()
      expect(() => scheduler.task('test3', () => {}).hourlyAt(59)).not.toThrow()
    })

    test('should reject invalid minute values', () => {
      expect(() => {
        scheduler.task('test1', () => {}).hourlyAt(-1)
      }).toThrow(/Invalid minute/)

      expect(() => {
        scheduler.task('test2', () => {}).hourlyAt(60)
      }).toThrow(/Invalid minute/)

      expect(() => {
        scheduler.task('test3', () => {}).hourlyAt(100)
      }).toThrow(/Invalid minute/)
    })

    test('should generate correct cron expression', () => {
      const task1 = scheduler.task('test1', () => {}).hourlyAt(15)
      expect(task1.getTask().expression).toBe('15 * * * *')

      const task2 = scheduler.task('test2', () => {}).hourlyAt(0)
      expect(task2.getTask().expression).toBe('0 * * * *')
    })
  })

  describe('dailyAt() validation (P1-03)', () => {
    test('should accept valid time formats', () => {
      expect(() => scheduler.task('test1', () => {}).dailyAt('00:00')).not.toThrow()
      expect(() => scheduler.task('test2', () => {}).dailyAt('14:30')).not.toThrow()
      expect(() => scheduler.task('test3', () => {}).dailyAt('23:59')).not.toThrow()
    })

    test('should reject invalid time formats', () => {
      expect(() => {
        scheduler.task('test1', () => {}).dailyAt('25:00')
      }).toThrow(/Invalid time format/)

      expect(() => {
        scheduler.task('test2', () => {}).dailyAt('12:60')
      }).toThrow(/Invalid time format/)

      expect(() => {
        scheduler.task('test3', () => {}).dailyAt('invalid')
      }).toThrow(/Invalid time format/)
    })

    test('should generate correct cron expression', () => {
      const task1 = scheduler.task('test1', () => {}).dailyAt('14:30')
      expect(task1.getTask().expression).toBe('30 14 * * *')

      const task2 = scheduler.task('test2', () => {}).dailyAt('09:00')
      expect(task2.getTask().expression).toBe('0 9 * * *')
    })
  })

  describe('weeklyOn() validation (P1-03)', () => {
    test('should accept valid day (0-6) and time', () => {
      expect(() => scheduler.task('sunday', () => {}).weeklyOn(0, '09:00')).not.toThrow()
      expect(() => scheduler.task('wednesday', () => {}).weeklyOn(3, '14:30')).not.toThrow()
      expect(() => scheduler.task('saturday', () => {}).weeklyOn(6, '23:59')).not.toThrow()
    })

    test('should reject invalid day values', () => {
      expect(() => {
        scheduler.task('test1', () => {}).weeklyOn(-1, '09:00')
      }).toThrow(/Invalid day of week/)

      expect(() => {
        scheduler.task('test2', () => {}).weeklyOn(7, '09:00')
      }).toThrow(/Invalid day of week/)
    })

    test('should reject invalid time formats', () => {
      expect(() => {
        scheduler.task('test1', () => {}).weeklyOn(1, '25:00')
      }).toThrow(/Invalid time format/)

      expect(() => {
        scheduler.task('test2', () => {}).weeklyOn(1, 'invalid')
      }).toThrow(/Invalid time format/)
    })

    test('should generate correct cron expression', () => {
      const task1 = scheduler.task('test1', () => {}).weeklyOn(1, '09:00')
      expect(task1.getTask().expression).toBe('0 9 * * 1')

      const task2 = scheduler.task('test2', () => {}).weeklyOn(5, '14:30')
      expect(task2.getTask().expression).toBe('30 14 * * 5')
    })
  })

  describe('monthlyOn() validation (P1-03)', () => {
    test('should accept valid day (1-31) and time', () => {
      expect(() => scheduler.task('test1', () => {}).monthlyOn(1, '09:00')).not.toThrow()
      expect(() => scheduler.task('test2', () => {}).monthlyOn(15, '14:30')).not.toThrow()
      expect(() => scheduler.task('test3', () => {}).monthlyOn(31, '23:59')).not.toThrow()
    })

    test('should reject invalid day values', () => {
      expect(() => {
        scheduler.task('test1', () => {}).monthlyOn(0, '09:00')
      }).toThrow(/Invalid day of month/)

      expect(() => {
        scheduler.task('test2', () => {}).monthlyOn(32, '09:00')
      }).toThrow(/Invalid day of month/)

      expect(() => {
        scheduler.task('test3', () => {}).monthlyOn(-1, '09:00')
      }).toThrow(/Invalid day of month/)
    })

    test('should reject invalid time formats', () => {
      expect(() => {
        scheduler.task('test1', () => {}).monthlyOn(15, '25:00')
      }).toThrow(/Invalid time format/)

      expect(() => {
        scheduler.task('test2', () => {}).monthlyOn(15, 'invalid')
      }).toThrow(/Invalid time format/)
    })

    test('should generate correct cron expression', () => {
      const task1 = scheduler.task('test1', () => {}).monthlyOn(1, '09:00')
      expect(task1.getTask().expression).toBe('0 9 1 * *')

      const task2 = scheduler.task('test2', () => {}).monthlyOn(15, '14:30')
      expect(task2.getTask().expression).toBe('30 14 15 * *')
    })
  })

  describe('Edge cases and error messages', () => {
    test('should provide descriptive error messages', () => {
      try {
        scheduler.task('test', () => {}).dailyAt('25:00')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('Invalid time format')
        expect((error as Error).message).toContain('25:00')
      }
    })

    test('should handle multiple validation failures independently', () => {
      expect(() => scheduler.task('negative-minute', () => {}).hourlyAt(-1)).toThrow()
      expect(() => scheduler.task('invalid-weekday', () => {}).weeklyOn(7, '00:00')).toThrow()
      expect(() => scheduler.task('invalid-monthday', () => {}).monthlyOn(0, '00:00')).toThrow()

      expect(() => {
        scheduler
          .task('valid', () => {})
          .daily()
          .at('12:00')
      }).not.toThrow()
    })
  })

  describe('Integration with existing patterns', () => {
    test('should work with fluent API chaining', () => {
      const task = scheduler
        .task('chained', () => {})
        .daily()
        .at('14:00')

      expect(task.getTask().expression).toBe('0 14 * * *')
      expect(task.getTask().timezone).toBe('UTC')
    })

    test('should work with timezone settings', () => {
      const task = scheduler
        .task('tz-test', () => {})
        .dailyAt('09:00')
        .timezone('America/New_York')

      expect(task.getTask().expression).toBe('0 9 * * *')
      expect(task.getTask().timezone).toBe('America/New_York')
    })
  })
})

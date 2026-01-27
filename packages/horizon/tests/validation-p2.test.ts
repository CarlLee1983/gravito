import { beforeEach, describe, expect, test } from 'bun:test'
import { LockManager } from '../src/locks/LockManager'
import { SchedulerManager } from '../src/SchedulerManager'

describe('P2: Additional Validation', () => {
  let scheduler: SchedulerManager

  beforeEach(() => {
    const lockManager = new LockManager('memory')
    scheduler = new SchedulerManager(lockManager)
  })

  describe('timezone() validation (P2-03)', () => {
    test('should accept valid timezones', () => {
      expect(() => {
        scheduler.task('test1', () => {}).timezone('UTC')
      }).not.toThrow()

      expect(() => {
        scheduler.task('test2', () => {}).timezone('Asia/Taipei')
      }).not.toThrow()

      expect(() => {
        scheduler.task('test3', () => {}).timezone('America/New_York')
      }).not.toThrow()

      expect(() => {
        scheduler.task('test4', () => {}).timezone('Europe/London')
      }).not.toThrow()
    })

    test('should reject invalid timezones', () => {
      expect(() => {
        scheduler.task('test1', () => {}).timezone('Invalid/Timezone')
      }).toThrow(/Invalid timezone/)

      expect(() => {
        scheduler.task('test2', () => {}).timezone('ABC')
      }).toThrow(/Invalid timezone/)

      expect(() => {
        scheduler.task('test3', () => {}).timezone('Asia/InvalidCity')
      }).toThrow(/Invalid timezone/)
    })

    test('should include helpful error message with link', () => {
      try {
        scheduler.task('test', () => {}).timezone('BadZone')
      } catch (error) {
        expect((error as Error).message).toContain('Invalid timezone')
        expect((error as Error).message).toContain('BadZone')
        expect((error as Error).message).toContain('wikipedia')
      }
    })
  })

  describe('cron() validation (P2-04)', () => {
    test('should accept valid cron expressions', () => {
      expect(() => {
        scheduler.task('test1', () => {}).cron('* * * * *')
      }).not.toThrow()

      expect(() => {
        scheduler.task('test2', () => {}).cron('0 0 * * *')
      }).not.toThrow()

      expect(() => {
        scheduler.task('test3', () => {}).cron('*/5 * * * *')
      }).not.toThrow()

      expect(() => {
        scheduler.task('test4', () => {}).cron('0 9-17 * * 1-5')
      }).not.toThrow()

      expect(() => {
        scheduler.task('test5', () => {}).cron('0,30 * * * *')
      }).not.toThrow()
    })

    test('should reject expressions with wrong number of parts', () => {
      expect(() => {
        scheduler.task('test1', () => {}).cron('* * *')
      }).toThrow(/Expected 5 parts/)

      expect(() => {
        scheduler.task('test2', () => {}).cron('* * * * * *')
      }).toThrow(/Expected 5 parts/)

      expect(() => {
        scheduler.task('test3', () => {}).cron('')
      }).toThrow(/Expected 5 parts/)

      expect(() => {
        scheduler.task('test4', () => {}).cron('*')
      }).toThrow(/Expected 5 parts/)
    })

    test('should reject expressions with invalid characters', () => {
      expect(() => {
        scheduler.task('test1', () => {}).cron('$ * * * *')
      }).toThrow(/contains invalid characters/)

      expect(() => {
        scheduler.task('test2', () => {}).cron('* % * * *')
      }).toThrow(/contains invalid characters/)

      expect(() => {
        scheduler.task('test3', () => {}).cron('* * ! * *')
      }).toThrow(/contains invalid characters/)
    })

    test('should handle extra whitespace correctly', () => {
      expect(() => {
        scheduler.task('test', () => {}).cron('  * * * * *  ')
      }).not.toThrow()

      const task = scheduler.task('test2', () => {}).cron('*  *  *  *  *')
      expect(task.getTask().expression).toBe('*  *  *  *  *')
    })
  })

  describe('timeout() validation', () => {
    test('should accept positive timeout values', () => {
      expect(() => {
        scheduler.task('test1', () => {}).timeout(1000)
      }).not.toThrow()

      expect(() => {
        scheduler.task('test2', () => {}).timeout(60000)
      }).not.toThrow()
    })

    test('should reject zero and negative timeouts', () => {
      expect(() => {
        scheduler.task('test1', () => {}).timeout(0)
      }).toThrow(/Timeout must be a positive number/)

      expect(() => {
        scheduler.task('test2', () => {}).timeout(-1000)
      }).toThrow(/Timeout must be a positive number/)
    })

    test('should set timeout correctly', () => {
      const task = scheduler.task('test', () => {}).timeout(5000)
      expect(task.getTask().timeout).toBe(5000)
    })
  })

  describe('Integration: validation with fluent API', () => {
    test('should validate when chaining methods', () => {
      expect(() => {
        scheduler
          .task('valid-chain', () => {})
          .daily()
          .at('09:00')
          .timezone('Asia/Taipei')
          .timeout(30000)
          .onOneServer()
      }).not.toThrow()
    })

    test('should fail fast on first invalid value in chain', () => {
      expect(() => {
        scheduler
          .task('invalid-chain', () => {})
          .daily()
          .at('25:00')
          .timezone('Asia/Taipei')
      }).toThrow(/Invalid time format/)
    })

    test('should allow timezone validation before time setting', () => {
      expect(() => {
        scheduler
          .task('test', () => {})
          .timezone('Invalid/Zone')
          .dailyAt('09:00')
      }).toThrow(/Invalid timezone/)
    })
  })
})

import { describe, expect, it } from 'bun:test'
import { Account } from '../../src/Domain/Account/Account'
import { AccountStatus } from '../../src/Domain/Account/AccountStatus'
import { Money } from '../../src/Domain/Shared/Money'

describe('Account AggregateRoot', () => {
  it('應該建立新帳戶', () => {
    const account = Account.create('acc-123', '王小明', 'TWD')
    expect(account.id).toBe('acc-123')
    expect(account.ownerName).toBe('王小明')
    expect(account.balance.cents).toBe(0)
    expect(account.status).toBe(AccountStatus.ACTIVE)
  })

  it('應該發出 AccountCreated 事件', () => {
    const account = Account.create('acc-123', '王小明', 'TWD')
    const events = account.pullDomainEvents()
    expect(events.length).toBe(1)
    expect(events[0].getEventName()).toBe('account.created')
  })

  it('應該能存款', () => {
    const account = Account.create('acc-123', '王小明', 'TWD')
    account.pullDomainEvents() // 清空建立事件

    const amount = new Money(10000, 'TWD')
    account.deposit(amount)

    expect(account.balance.cents).toBe(10000)
    const events = account.pullDomainEvents()
    expect(events.length).toBe(1)
    expect(events[0].getEventName()).toBe('funds.deposited')
  })

  it('應該能提款', () => {
    const account = Account.create('acc-123', '王小明', 'TWD')
    account.deposit(new Money(10000, 'TWD'))
    account.pullDomainEvents()

    const amount = new Money(3000, 'TWD')
    account.withdraw(amount)

    expect(account.balance.cents).toBe(7000)
  })

  it('應該拒絕餘額不足的提款', () => {
    const account = Account.create('acc-123', '王小明', 'TWD')
    account.deposit(new Money(5000, 'TWD'))

    expect(() => account.withdraw(new Money(10000, 'TWD'))).toThrow('餘額不足')
  })

  it('應該能轉帳', () => {
    const account1 = Account.create('acc-1', '王小明', 'TWD')
    account1.deposit(new Money(10000, 'TWD'))
    account1.pullDomainEvents()

    account1.transferTo('acc-2', new Money(3000, 'TWD'))

    expect(account1.balance.cents).toBe(7000)
  })

  it('應該拒絕超限轉帳', () => {
    const account = Account.create('acc-123', '王小明', 'TWD')
    account.deposit(Money.fromDollars(200_000, 'TWD'))

    expect(() => account.transferTo('acc-2', Money.fromDollars(100_001, 'TWD'))).toThrow()
  })

  it('應該能凍結帳戶', () => {
    const account = Account.create('acc-123', '王小明', 'TWD')
    account.freeze()

    expect(account.status).toBe(AccountStatus.FROZEN)
    expect(() => account.deposit(new Money(1000, 'TWD'))).toThrow()
  })

  it('應該能關閉帳戶（餘額為零）', () => {
    const account = Account.create('acc-123', '王小明', 'TWD')
    account.close()

    expect(account.status).toBe(AccountStatus.CLOSED)
  })

  it('應該拒絕關閉有餘額的帳戶', () => {
    const account = Account.create('acc-123', '王小明', 'TWD')
    account.deposit(new Money(1000, 'TWD'))

    expect(() => account.close()).toThrow('帳戶關閉前必須提取全部金額')
  })
})

import { describe, expect, it } from 'bun:test'
import { InvalidTransitionError } from '../../../src/Domain/Errors/InvoiceError'
import { InvoiceStatus } from '../../../src/Domain/ValueObjects/InvoiceStatus'

describe('InvoiceStatus ValueObject', () => {
  it('應該正確建立 ISSUED 狀態', () => {
    const status = InvoiceStatus.create('ISSUED')
    expect(status.value).toBe('ISSUED')
    expect(status.toString()).toBe('ISSUED')
  })

  it('應該正確建立初始狀態（ISSUED）', () => {
    const status = InvoiceStatus.initial()
    expect(status.value).toBe('ISSUED')
  })

  it('應該從 ISSUED 轉移到 CANCELLED', () => {
    const status = InvoiceStatus.create('ISSUED')
    const newStatus = status.transitionTo('CANCELLED')

    expect(newStatus.value).toBe('CANCELLED')
  })

  it('應該從 ISSUED 轉移到 RETURNED', () => {
    const status = InvoiceStatus.create('ISSUED')
    const newStatus = status.transitionTo('RETURNED')

    expect(newStatus.value).toBe('RETURNED')
  })

  it('應該拒絕從 CANCELLED 轉移到其他狀態', () => {
    const status = InvoiceStatus.create('CANCELLED')

    expect(() => status.transitionTo('ISSUED')).toThrow(InvalidTransitionError)
    expect(() => status.transitionTo('RETURNED')).toThrow(InvalidTransitionError)
  })

  it('應該拒絕從 RETURNED 轉移到其他狀態', () => {
    const status = InvoiceStatus.create('RETURNED')

    expect(() => status.transitionTo('ISSUED')).toThrow(InvalidTransitionError)
    expect(() => status.transitionTo('CANCELLED')).toThrow(InvalidTransitionError)
  })

  it('應該檢查狀態是否為 ISSUED', () => {
    const issuedStatus = InvoiceStatus.create('ISSUED')
    const cancelledStatus = InvoiceStatus.create('CANCELLED')

    expect(issuedStatus.isIssued()).toBe(true)
    expect(cancelledStatus.isIssued()).toBe(false)
  })

  it('應該檢查狀態是否為 CANCELLED', () => {
    const cancelledStatus = InvoiceStatus.create('CANCELLED')
    const issuedStatus = InvoiceStatus.create('ISSUED')

    expect(cancelledStatus.isCancelled()).toBe(true)
    expect(issuedStatus.isCancelled()).toBe(false)
  })

  it('應該檢查狀態是否為 RETURNED', () => {
    const returnedStatus = InvoiceStatus.create('RETURNED')
    const issuedStatus = InvoiceStatus.create('ISSUED')

    expect(returnedStatus.isReturned()).toBe(true)
    expect(issuedStatus.isReturned()).toBe(false)
  })

  it('應該檢查發票是否可被取消', () => {
    const issuedStatus = InvoiceStatus.create('ISSUED')
    const cancelledStatus = InvoiceStatus.create('CANCELLED')

    expect(issuedStatus.canBeCancelled()).toBe(true)
    expect(cancelledStatus.canBeCancelled()).toBe(false)
  })

  it('應該正確比較兩個相同的狀態', () => {
    const status1 = InvoiceStatus.create('ISSUED')
    const status2 = InvoiceStatus.create('ISSUED')

    expect(status1.equals(status2)).toBe(true)
  })

  it('應該正確比較兩個不同的狀態', () => {
    const status1 = InvoiceStatus.create('ISSUED')
    const status2 = InvoiceStatus.create('CANCELLED')

    expect(status1.equals(status2)).toBe(false)
  })
})

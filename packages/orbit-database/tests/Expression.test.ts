/**
 * Expression Class Tests
 */

import { describe, expect, it } from 'bun:test'
import { Expression, raw } from '../src/query/Expression'

describe('Expression', () => {
    describe('constructor', () => {
        it('should create an expression with value', () => {
            const expr = new Expression('NOW()')
            expect(expr.getValue()).toBe('NOW()')
        })

        it('should store bindings', () => {
            const expr = new Expression('COALESCE(?, ?)', ['default', 0])
            expect(expr.getValue()).toBe('COALESCE(?, ?)')
            expect(expr.getBindings()).toEqual(['default', 0])
        })
    })

    describe('getValue', () => {
        it('should return the raw SQL value', () => {
            const expr = new Expression('COUNT(*)')
            expect(expr.getValue()).toBe('COUNT(*)')
        })
    })

    describe('getBindings', () => {
        it('should return empty array when no bindings', () => {
            const expr = new Expression('NOW()')
            expect(expr.getBindings()).toEqual([])
        })

        it('should return bindings array', () => {
            const expr = new Expression('? + ?', [1, 2])
            expect(expr.getBindings()).toEqual([1, 2])
        })
    })

    describe('toString', () => {
        it('should return the value as string', () => {
            const expr = new Expression('SUM(amount)')
            expect(String(expr)).toBe('SUM(amount)')
        })
    })
})

describe('raw() helper', () => {
    it('should create an Expression instance', () => {
        const expr = raw('NOW()')
        expect(expr).toBeInstanceOf(Expression)
        expect(expr.getValue()).toBe('NOW()')
    })

    it('should accept bindings', () => {
        const expr = raw('? + ?', [1, 2])
        expect(expr.getBindings()).toEqual([1, 2])
    })
})

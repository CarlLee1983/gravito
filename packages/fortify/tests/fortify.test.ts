import { describe, test, expect, beforeAll } from 'bun:test'
import { PlanetCore, Router, type GravitoContext } from 'gravito-core'
import { FortifyOrbit, type FortifyConfig } from '../src/index'

// Mock User Model for testing
class MockUser {
    static table = 'users'
    static records: Map<number, MockUser> = new Map()
    static nextId = 1

    id: number
    name: string
    email: string
    password: string
    email_verified_at: Date | null = null

    constructor(data: Partial<MockUser>) {
        this.id = data.id ?? MockUser.nextId++
        this.name = data.name ?? ''
        this.email = data.email ?? ''
        this.password = data.password ?? ''
        this.email_verified_at = data.email_verified_at ?? null
    }

    static async create(data: Partial<MockUser>): Promise<MockUser> {
        const user = new MockUser(data)
        MockUser.records.set(user.id, user)
        return user
    }

    static async find(id: number): Promise<MockUser | null> {
        return MockUser.records.get(id) ?? null
    }

    static query() {
        return {
            where: (field: string, value: any) => ({
                first: async () => {
                    for (const user of MockUser.records.values()) {
                        if ((user as any)[field] === value) {
                            return user
                        }
                    }
                    return null
                },
            }),
        }
    }

    async save(): Promise<void> {
        MockUser.records.set(this.id, this)
    }

    static reset(): void {
        MockUser.records.clear()
        MockUser.nextId = 1
    }
}

describe('Fortify Route Registration', () => {
    test('registers all auth routes when all features enabled', async () => {
        MockUser.reset()

        const config: FortifyConfig = {
            userModel: () => MockUser as any,
            features: {
                registration: true,
                resetPasswords: true,
                emailVerification: true,
            },
            jsonMode: true,
        }

        const core = new PlanetCore()
        core.orbit(new FortifyOrbit(config))

        const server = await core.liftoff()
        const fetch = server.fetch as (req: Request) => Promise<Response>

        // Test login routes exist
        const loginGet = await fetch(new Request('http://localhost/login'))
        expect(loginGet.status).toBe(200)
        expect((await loginGet.json()).view).toBe('login')

        // Test register routes exist
        const registerGet = await fetch(new Request('http://localhost/register'))
        expect(registerGet.status).toBe(200)
        expect((await registerGet.json()).view).toBe('register')

        // Test forgot-password routes exist
        const forgotGet = await fetch(new Request('http://localhost/forgot-password'))
        expect(forgotGet.status).toBe(200)
        expect((await forgotGet.json()).view).toBe('forgot-password')

        // Test verify-email routes exist (requires auth, so just check it doesn't 404)
        const verifyGet = await fetch(new Request('http://localhost/verify-email'))
        // Should redirect to login since not authenticated
        expect([200, 302].includes(verifyGet.status)).toBe(true)
    })

    test('does not register disabled feature routes', async () => {
        MockUser.reset()

        const config: FortifyConfig = {
            userModel: () => MockUser as any,
            features: {
                registration: false,
                resetPasswords: false,
                emailVerification: false,
            },
            jsonMode: true,
        }

        const core = new PlanetCore()
        core.orbit(new FortifyOrbit(config))

        const server = await core.liftoff()
        const fetch = server.fetch as (req: Request) => Promise<Response>

        // Registration should be 404 when disabled
        const registerGet = await fetch(new Request('http://localhost/register'))
        expect(registerGet.status).toBe(404)

        // Forgot password should be 404 when disabled
        const forgotGet = await fetch(new Request('http://localhost/forgot-password'))
        expect(forgotGet.status).toBe(404)

        // Login should still work (core feature)
        const loginGet = await fetch(new Request('http://localhost/login'))
        expect(loginGet.status).toBe(200)
    })

    test('applies route prefix correctly', async () => {
        MockUser.reset()

        const config: FortifyConfig = {
            userModel: () => MockUser as any,
            prefix: '/auth',
            jsonMode: true,
        }

        const core = new PlanetCore()
        core.orbit(new FortifyOrbit(config))

        const server = await core.liftoff()
        const fetch = server.fetch as (req: Request) => Promise<Response>

        // Should be accessible at /auth/login
        const prefixedLogin = await fetch(new Request('http://localhost/auth/login'))
        expect(prefixedLogin.status).toBe(200)
        expect((await prefixedLogin.json()).view).toBe('login')

        // Root /login should be 404
        const rootLogin = await fetch(new Request('http://localhost/login'))
        expect(rootLogin.status).toBe(404)
    })
})

describe('Fortify Controllers - GET Routes', () => {
    let fetch: (req: Request) => Promise<Response>

    beforeAll(async () => {
        MockUser.reset()

        const config: FortifyConfig = {
            userModel: () => MockUser as any,
            features: {
                registration: true,
                resetPasswords: true,
                emailVerification: true,
            },
            jsonMode: true,
        }

        const core = new PlanetCore()
        core.orbit(new FortifyOrbit(config))

        const server = await core.liftoff()
        fetch = server.fetch as (req: Request) => Promise<Response>
    })

    test('GET /login returns correct JSON response in JSON mode', async () => {
        const response = await fetch(new Request('http://localhost/login'))
        expect(response.status).toBe(200)

        const data = await response.json()
        expect(data).toEqual({ view: 'login' })
    })

    test('GET /register returns correct JSON response', async () => {
        const response = await fetch(new Request('http://localhost/register'))
        expect(response.status).toBe(200)

        const data = await response.json()
        expect(data).toEqual({ view: 'register' })
    })

    test('GET /forgot-password returns correct JSON response', async () => {
        const response = await fetch(new Request('http://localhost/forgot-password'))
        expect(response.status).toBe(200)

        const data = await response.json()
        expect(data).toEqual({ view: 'forgot-password' })
    })

    test('GET /reset-password/:token returns token in response', async () => {
        const response = await fetch(
            new Request('http://localhost/reset-password/test-token-123?email=test@example.com')
        )
        expect(response.status).toBe(200)

        const data = await response.json()
        expect(data.view).toBe('reset-password')
        expect(data.token).toBe('test-token-123')
        expect(data.email).toBe('test@example.com')
    })
})

describe('Fortify HTML Mode', () => {
    test('returns HTML when jsonMode is false', async () => {
        MockUser.reset()

        const config: FortifyConfig = {
            userModel: () => MockUser as any,
            jsonMode: false, // HTML mode
        }

        const core = new PlanetCore()
        core.orbit(new FortifyOrbit(config))

        const server = await core.liftoff()
        const fetch = server.fetch as (req: Request) => Promise<Response>

        const response = await fetch(new Request('http://localhost/login'))
        expect(response.status).toBe(200)

        const contentType = response.headers.get('content-type')
        expect(contentType).toContain('text/html')

        const html = await response.text()
        expect(html).toContain('<!DOCTYPE html>')
        expect(html).toContain('Sign In')
        expect(html).toContain('<form')
    })
})

describe('FortifyConfig Defaults', () => {
    test('uses default values when not specified', async () => {
        MockUser.reset()

        const config: FortifyConfig = {
            userModel: () => MockUser as any,
            // No other config - should use defaults
        }

        const core = new PlanetCore()
        core.orbit(new FortifyOrbit(config))

        const server = await core.liftoff()
        const fetch = server.fetch as (req: Request) => Promise<Response>

        // Default features.registration should be true
        const registerGet = await fetch(new Request('http://localhost/register'))
        expect(registerGet.status).toBe(200)

        // Default features.resetPasswords should be true
        const forgotGet = await fetch(new Request('http://localhost/forgot-password'))
        expect(forgotGet.status).toBe(200)
    })
})

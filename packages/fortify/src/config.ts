import type { Model } from '@gravito/atlas'

/**
 * Fortify configuration options
 */
export interface FortifyConfig {
    /**
     * Feature flags to enable/disable specific authentication features
     */
    features: {
        /** Enable user registration. Default: true */
        registration?: boolean
        /** Enable password reset. Default: true */
        resetPasswords?: boolean
        /** Enable email verification. Default: false */
        emailVerification?: boolean
        /** Enable profile update. Default: false */
        updateProfileInformation?: boolean
        /** Enable password update. Default: false */
        updatePasswords?: boolean
        /** Enable two-factor authentication. Default: false (P2) */
        twoFactorAuthentication?: boolean
    }

    /**
     * Redirect paths after authentication actions
     */
    redirects: {
        /** Redirect after successful login. Default: '/dashboard' */
        login?: string
        /** Redirect after logout. Default: '/' */
        logout?: string
        /** Redirect after successful registration. Default: '/dashboard' */
        register?: string
        /** Redirect after password reset. Default: '/login' */
        passwordReset?: string
        /** Redirect after email verification. Default: '/dashboard' */
        emailVerification?: string
    }

    /**
     * View/template paths (optional, for custom views)
     */
    views?: {
        login?: string
        register?: string
        forgotPassword?: string
        resetPassword?: string
        verifyEmail?: string
    }

    /**
     * User model factory function
     */
    userModel: () => typeof Model

    /**
     * Username field for authentication (default: 'email')
     */
    username?: string

    /**
     * Password field name (default: 'password')
     */
    password?: string

    /**
     * Route prefix (default: '')
     */
    prefix?: string

    /**
     * Use JSON responses instead of redirects (for SPA/API mode)
     */
    jsonMode?: boolean
}

/**
 * Default Fortify configuration
 */
export const defaultFortifyConfig: Partial<FortifyConfig> = {
    features: {
        registration: true,
        resetPasswords: true,
        emailVerification: false,
        updateProfileInformation: false,
        updatePasswords: false,
        twoFactorAuthentication: false,
    },
    redirects: {
        login: '/dashboard',
        logout: '/',
        register: '/dashboard',
        passwordReset: '/login',
        emailVerification: '/dashboard',
    },
    username: 'email',
    password: 'password',
    prefix: '',
    jsonMode: false,
}

/**
 * Define Fortify configuration with type safety
 */
export function definefortifyConfig(config: FortifyConfig): FortifyConfig {
    return {
        ...defaultFortifyConfig,
        ...config,
        features: {
            ...defaultFortifyConfig.features,
            ...config.features,
        },
        redirects: {
            ...defaultFortifyConfig.redirects,
            ...config.redirects,
        },
    }
}

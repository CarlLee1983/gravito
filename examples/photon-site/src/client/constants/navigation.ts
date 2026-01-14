import { Book, Play, Share2, Activity, Layers, Zap, Terminal, Shield, List, HardDrive, Cpu, Settings, TestTube, Globe, Server } from 'lucide-react'

export interface NavItem {
    id: string
    label: string
    icon: any
    href: string
}

export interface NavGroup {
    category: string
    items: NavItem[]
}

export const navGroups: NavGroup[] = [
    {
        category: 'GETTING_STARTED',
        items: [
            { id: 'intro', label: 'INTRODUCTION', icon: Book, href: '/docs/intro' },
            { id: 'quickstart', label: 'QUICKSTART', icon: Play, href: '/docs/quickstart' },
            { id: 'structure', label: 'PROJECT_STRUCTURE', icon: List, href: '/docs/structure' },
        ]
    },
    {
        category: 'CORE_ENGINE',
        items: [
            { id: 'routing', label: 'ROUTING_SYSTEM', icon: Share2, href: '/docs/routing' },
            { id: 'context', label: 'CONTEXT_API', icon: Activity, href: '/docs/context' },
            { id: 'middleware', label: 'MIDDLEWARE_MATRIX', icon: Layers, href: '/docs/middleware' },
            { id: 'exceptions', label: 'EXCEPTION_HANDLING', icon: Shield, href: '/docs/exceptions' },
        ]
    },
    {
        category: 'PHYSICAL_LAYER',
        items: [
            { id: 'ilo', label: 'INSTRUCTION_LEVEL_OPT', icon: Cpu, href: '/docs/ilo' },
            { id: 'zero-copy', label: 'ZERO_COPY_BUFFERING', icon: HardDrive, href: '/docs/zero-copy' },
            { id: 'memory', label: 'RECYCLED_CONTEXT', icon: Activity, href: '/docs/memory' },
        ]
    },
    {
        category: 'FULLSTACK_SUITE',
        items: [
            { id: 'prism', label: 'PRISM_TEMPLATES', icon: Zap, href: '/docs/prism' },
            { id: 'ion', label: 'ION_SPA_BRIDGE', icon: Terminal, href: '/docs/ion' },
            { id: 'atlas', label: 'ATLAS_ORM', icon: Server, href: '/docs/atlas' },
        ]
    },
    {
        category: 'ADVANCED',
        items: [
            { id: 'testing', label: 'TESTING_SUITE', icon: TestTube, href: '/docs/testing' },
            { id: 'deployment', label: 'BUN_DEPLOYMENT', icon: Globe, href: '/docs/deployment' },
            { id: 'performance', label: 'PERF_TUNING', icon: Settings, href: '/docs/performance' },
        ]
    }
]

// Flat version for easy lookups
export const navItems = navGroups.flatMap(g => g.items)

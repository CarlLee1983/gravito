import {
  Activity,
  Book,
  Cpu,
  Database,
  Globe,
  HardDrive,
  Layers,
  List,
  Play,
  Server,
  Settings,
  Share2,
  Shield,
  Terminal,
  TestTube,
  Zap,
} from 'lucide-react'

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
    ],
  },
  {
    category: 'TECHNICAL_ARCHITECTURE',
    items: [
      { id: 'patterns', label: 'PATTERN_GALLERY', icon: Layers, href: '/patterns' },
      { id: 'routing', label: 'ROUTING_SYSTEM', icon: Share2, href: '/docs/routing' },
      { id: 'context', label: 'CONTEXT_API', icon: Activity, href: '/docs/context' },
    ],
  },
  {
    category: 'CORE_LIFECYCLE',
    items: [
      { id: 'middleware', label: 'MIDDLEWARE_MATRIX', icon: Layers, href: '/docs/middleware' },
      { id: 'exceptions', label: 'EXCEPTION_HANDLING', icon: Shield, href: '/docs/exceptions' },
      { id: 'performance', label: 'PERF_TUNING', icon: Settings, href: '/docs/performance' },
    ],
  },
  {
    category: 'PHYSICAL_LAYER',
    items: [
      { id: 'ilo', label: 'INSTRUCTION_LEVEL_OPT', icon: Cpu, href: '/docs/ilo' },
      { id: 'zero-copy', label: 'ZERO_COPY_BUFFERING', icon: HardDrive, href: '/docs/zero-copy' },
      { id: 'memory', label: 'RECYCLED_CONTEXT', icon: Activity, href: '/docs/memory' },
    ],
  },
  {
    category: 'EXTENSIONS_ECO',
    items: [
      { id: 'ecosystem', label: 'ECOSYSTEM_REGISTRY', icon: Zap, href: '/ecosystem' },
      { id: 'testing', label: 'TESTING_SUITE', icon: TestTube, href: '/docs/testing' },
      { id: 'deployment', label: 'BUN_DEPLOYMENT', icon: Globe, href: '/docs/deployment' },
    ],
  },
  {
    category: 'LAB_EXPERIMENTS',
    items: [
      {
        id: 'ex-hello-world',
        label: 'ULTRA_HELLO_WORLD',
        icon: Play,
        href: '/docs/ex-hello-world',
      },
      {
        id: 'ex-file-stream',
        label: 'ZERO_COPY_STREAM',
        icon: HardDrive,
        href: '/docs/ex-file-stream',
      },
      {
        id: 'ex-middleware',
        label: 'MIDDLEWARE_PULSE',
        icon: Activity,
        href: '/docs/ex-middleware',
      },
      {
        id: 'ex-crud-atlas',
        label: 'ATOMIC_CRUD_ATLAS',
        icon: Database,
        href: '/docs/ex-crud-atlas',
      },
    ],
  },
]

// Flat version for easy lookups
export const navItems = navGroups.flatMap((g) => g.items)

import React, { useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Zap, Share2, Activity, Layers, Terminal, Database,
    ChevronRight, ExternalLink, Code2, Cpu, HardDrive, Shield, Globe
} from 'lucide-react'
import { DocsLayout } from '../components/DocsLayout'

interface Pattern {
    id: string
    title: string
    description: string
    icon: any
    tags: string[]
    code: string
    link?: string
    complexity: 'LOW' | 'MID' | 'HIGH'
}

const patterns: Pattern[] = [
    {
        id: 'rest-api',
        title: 'Standard JSON API',
        description: 'High-speed REST endpoints with AOT routing and optimized JSON serialization.',
        icon: Share2,
        tags: ['REST', 'JSON', 'AOT'],
        complexity: 'LOW',
        code: `app.get('/api/v1/users', (c) => {
  return c.json({ users: [] })
})

app.post('/api/v1/users', async (c) => {
  const body = await c.req.json()
  return c.json({ created: true }, 201)
})`
    },
    {
        id: 'sse-streaming',
        title: 'Server-Sent Events',
        description: 'Real-time data streaming using Bun\'s native stream controllers.',
        icon: Activity,
        tags: ['SSE', 'Real-time', 'Streaming'],
        complexity: 'MID',
        code: `app.get('/events', (c) => {
  return c.streamText(async (stream) => {
    while (true) {
      await stream.write(\`data: \${Date.now()}\\n\\n\`)
      await stream.sleep(1000)
    }
  })
})`
    },
    {
        id: 'proxy-handler',
        title: 'High-Speed Proxy',
        description: 'Transparent request forwarding with zero-copy header injection.',
        icon: Globe,
        tags: ['Proxy', 'Forwarding', 'Networking'],
        complexity: 'MID',
        code: `app.all('/proxy/*', async (c) => {
  const url = new URL(c.req.url)
  const target = 'https://legacy-api.internal' + url.pathname
  
  const res = await fetch(target, {
    method: c.req.method,
    headers: c.req.header()
  })
  
  return c.res(res.body, res.status, res.headers)
})`
    },
    {
        id: 'file-upload',
        title: 'Multipart Handling',
        description: 'Efficient processing of file uploads and form-data boundaries.',
        icon: HardDrive,
        tags: ['Upload', 'Binary', 'Form-Data'],
        complexity: 'MID',
        code: `app.post('/upload', async (c) => {
  const body = await c.req.parseBody()
  const file = body.file as File
  
  await Bun.write(\`./storage/\${file.name}\`, file)
  return c.text('UPLOAD_COMPLETE')
})`
    },
    {
        id: 'middleware-orchestration',
        title: 'Custom Auth Flow',
        description: 'Securing route groups with non-blocking middleware chains.',
        icon: Shield,
        tags: ['Auth', 'Middleware', 'Security'],
        complexity: 'HIGH',
        code: `const auth = async (c, next) => {
  const apiKey = c.req.header('X-API-KEY')
  if (apiKey !== 'SECRET') return c.json({ error: 'INVALID' }, 403)
  await next()
}

app.use('/admin/*', auth)
app.get('/admin/config', (c) => c.json({ active: true }))`
    },
    {
        id: 'atlas-integration',
        title: 'Database Pipeline',
        description: 'Synchronous-feeling database operations with Atlas ORM entities.',
        icon: Database,
        tags: ['ORM', 'PostgreSQL', 'Model'],
        complexity: 'HIGH',
        code: `@Table('projects')
class Project extends Model {
  @Column() title: string
}

app.get('/projects', async (c) => {
  const data = await Project.query().get()
  return c.json(data)
})`
    }
]

export default function Patterns() {
    const [selectedId, setSelectedId] = useState<string | null>(null)

    return (
        <DocsLayout currentId="patterns">
            <Head title="Architecture Patterns | Photon Engine" />

            <div className="mb-16">
                <div className="flex items-center gap-3 mb-6">
                    <div className="px-2 py-0.5 bg-photon-gold/10 border border-photon-gold/20 rounded text-[10px] text-photon-gold font-technical tracking-[0.2em] uppercase">
                        Lab_Matrix
                    </div>
                </div>
                <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter mb-8 leading-[0.95]">
                    Architecture<br />
                    <span className="text-photon-gold">Patterns</span>
                </h1>
                <p className="text-xl text-gray-500 font-light max-w-2xl leading-relaxed">
                    A curated collection of production-grade implementation templates.
                    Optimized for Bun. Engineered for Photon.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                {patterns.map((pattern, idx) => (
                    <motion.div
                        key={pattern.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`group relative p-8 bg-white/[0.02] border border-white/5 hover:border-photon-gold/30 transition-all duration-500 overflow-hidden ${selectedId === pattern.id ? 'md:col-span-2 ring-1 ring-photon-gold/50' : ''}`}
                        onClick={() => setSelectedId(selectedId === pattern.id ? null : pattern.id)}
                    >
                        {/* Background Scanline for Active */}
                        {selectedId === pattern.id && (
                            <div className="absolute inset-0 pointer-events-none opacity-10 scanline" />
                        )}

                        <div className="flex items-start justify-between mb-8">
                            <div className={`p-3 rounded-lg bg-white/5 text-gray-400 group-hover:text-photon-gold transition-colors duration-500 ${selectedId === pattern.id ? 'text-photon-gold' : ''}`}>
                                <pattern.icon size={24} strokeWidth={1.5} />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-technical tracking-widest px-2 py-1 border rounded uppercase ${pattern.complexity === 'LOW' ? 'border-green-500/30 text-green-500/60' :
                                        pattern.complexity === 'MID' ? 'border-photon-gold/30 text-photon-gold/60' :
                                            'border-red-500/30 text-red-500/60'
                                    }`}>
                                    {pattern.complexity}_Level
                                </span>
                            </div>
                        </div>

                        <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-3">
                            {pattern.title}
                            <ChevronRight size={16} className={`text-photon-gold transition-transform duration-500 ${selectedId === pattern.id ? 'rotate-90' : 'group-hover:translate-x-1'}`} />
                        </h3>

                        <p className="text-gray-500 text-sm leading-relaxed mb-8 max-w-md">
                            {pattern.description}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-8">
                            {pattern.tags.map(tag => (
                                <span key={tag} className="text-[9px] font-technical text-white/20 uppercase tracking-[0.2em]">
                                    #{tag}
                                </span>
                            ))}
                        </div>

                        <AnimatePresence>
                            {selectedId === pattern.id && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="pt-8 border-t border-white/5"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[10px] font-technical text-gray-600 uppercase tracking-widest flex items-center gap-2">
                                            <Code2 size={12} /> implementation.ts
                                        </span>
                                        <button className="text-[10px] font-technical text-photon-gold/60 hover:text-photon-gold uppercase tracking-widest">
                                            Copy_Code
                                        </button>
                                    </div>
                                    <div className="bg-black/40 p-6 rounded-lg border border-white/5 font-mono text-[13px] text-gray-300 leading-relaxed overflow-x-auto">
                                        <pre><code>{pattern.code}</code></pre>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Hover Overlay Light */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-photon-gold/5 blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    </motion.div>
                ))}
            </div>

            {/* Bottom Footer HUD Style */}
            <div className="mt-24 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-8 text-[9px] font-technical text-gray-700 tracking-[0.3em] uppercase">
                    <span className="flex items-center gap-2"><Cpu size={10} /> Instr_Ready</span>
                    <span className="flex items-center gap-2 text-photon-gold/40"><Zap size={10} /> Runtime_Active</span>
                </div>
                <div className="text-[9px] font-technical text-gray-800 tracking-[0.3em] uppercase">
                    Ref_0x71_Architecture_Library
                </div>
            </div>
        </DocsLayout>
    )
}

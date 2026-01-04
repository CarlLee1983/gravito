import { motion } from 'framer-motion'
import {
  Activity,
  ArrowRight,
  BookOpen,
  Database,
  Github,
  LayoutDashboard,
  Server,
  Zap,
} from 'lucide-react'
import React from 'react'

export default function Home() {
  return (
    <div className="min-h-screen bg-zenith-900 text-white selection:bg-zenith-accent selection:text-zenith-900 overflow-x-hidden font-sans">
      {/* Navigation */}
      <nav className="fixed w-full z-50 border-b border-white/10 bg-zenith-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-zenith-500 to-zenith-accent flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-wider">ZENITH</span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
              <a href="/" className="hover:text-white transition-colors">
                Features
              </a>
              <a href="/" className="hover:text-white transition-colors">
                Integration
              </a>
              <a href="/" className="hover:text-white transition-colors">
                Docs
              </a>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/gravito-work/gravito"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <button
                type="button"
                className="hidden md:flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded text-sm font-medium transition-colors border border-white/10"
              >
                <span>v0.1.0</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-zenith-500/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-zenith-accent/10 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Hero Content */}
            <div className="flex-1 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zenith-500/10 border border-zenith-500/20 text-zenith-400 text-xs font-mono mb-6">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zenith-accent opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-zenith-accent"></span>
                  </span>
                  SYSTEM ONLINE
                </div>
                <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight">
                  Control Plane for <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-zenith-400 to-zenith-accent">
                    Flux & Stream
                  </span>
                </h1>
                <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                  Real-time visibility, queue management, and dead-letter inspection for your
                  asynchronous infrastructure. Zero configuration required.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                  <button
                    type="button"
                    className="w-full sm:w-auto px-8 py-3 bg-zenith-500 hover:bg-zenith-400 text-white rounded font-medium transition-all shadow-lg shadow-zenith-500/25 flex items-center justify-center gap-2 group"
                  >
                    Get Started{' '}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button
                    type="button"
                    className="w-full sm:w-auto px-8 py-3 bg-transparent border border-white/20 hover:bg-white/5 text-white rounded font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" /> Documentation
                  </button>
                </div>
              </motion.div>
            </div>

            {/* Hero Visual - Dashboard Mockup */}
            <div className="flex-1 w-full max-w-lg lg:max-w-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="relative rounded-xl border border-white/10 bg-black/50 backdrop-blur-xl p-4 shadow-2xl"
              >
                {/* Mockup Header */}
                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="text-xs text-gray-500 font-mono">zenith-dashboard.local</div>
                </div>

                {/* Mockup Content Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Stat Card 1 */}
                  <div className="bg-white/5 p-4 rounded border border-white/5">
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                      Throughput
                    </div>
                    <div className="text-2xl font-mono font-bold text-zenith-accent flex items-baseline gap-2">
                      12,450 <span className="text-xs text-gray-500 font-sans">ops/sec</span>
                    </div>
                    <div className="h-1 w-full bg-white/10 mt-2 rounded overflow-hidden">
                      <div className="h-full w-3/4 bg-zenith-accent rounded animate-pulse" />
                    </div>
                  </div>

                  {/* Stat Card 2 */}
                  <div className="bg-white/5 p-4 rounded border border-white/5">
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                      Active Workers
                    </div>
                    <div className="text-2xl font-mono font-bold text-green-400 flex items-baseline gap-2">
                      48 <span className="text-xs text-gray-500 font-sans">nodes</span>
                    </div>
                    <div className="flex gap-1 mt-3">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-2 w-2 rounded-full bg-green-400 opacity-80" />
                      ))}
                    </div>
                  </div>

                  {/* Queue List */}
                  <div className="col-span-2 bg-white/5 p-4 rounded border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs text-gray-400 uppercase tracking-wider">
                        Active Queues
                      </div>
                      <div className="text-xs text-zenith-500">View All</div>
                    </div>
                    <div className="space-y-2">
                      {['emails.transactional', 'images.process', 'analytics.batch'].map((q, i) => (
                        <div
                          key={q}
                          className="flex items-center justify-between p-2 bg-black/20 rounded"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-green-400' : 'bg-zenith-accent'}`}
                            />
                            <span className="text-sm font-mono text-gray-300">{q}</span>
                          </div>
                          <span className="text-xs text-gray-500 font-mono">
                            {Math.floor(Math.random() * 1000)} jobs
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Activity />}
              title="Real-time Insights"
              description="Visualize job throughput, worker saturation, and error rates with millisecond latency updates."
            />
            <FeatureCard
              icon={<Server />}
              title="Worker Management"
              description="Gracefully stop, restart, or scale your worker nodes directly from the control plane interface."
            />
            <FeatureCard
              icon={<Database />}
              title="Dead Letter Inspection"
              description="Review failed jobs, inspect stack traces, and replay specific events with a single click."
            />
          </div>
        </div>
      </section>

      {/* Code Snippet Section */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-6">Drop-in Integration</h2>
              <p className="text-gray-400 mb-8 text-lg">
                Zenith automatically discovers your Flux queues and Stream topics. Just mount the
                dashboard middleware and you're ready to launch.
              </p>

              <ul className="space-y-4">
                <ListItem text="Auto-discovery of queues and topics" />
                <ListItem text="Role-based access control built-in" />
                <ListItem text="Zero-overhead monitoring agent" />
                <ListItem text="Customizable alert thresholds" />
              </ul>
            </div>

            <div className="flex-1 w-full">
              <div className="bg-[#0d1117] rounded-lg border border-white/10 p-6 font-mono text-sm overflow-x-auto">
                <div className="flex gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500/20" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/20" />
                  <div className="w-3 h-3 rounded-full bg-green-500/20" />
                </div>
                <pre className="text-gray-300">
                  <code>
                    <div className="line">
                      <span className="text-purple-400">import</span> {'{'} Zenith {'}'}{' '}
                      <span className="text-purple-400">from</span>{' '}
                      <span className="text-green-400">'@gravito/zenith'</span>
                    </div>
                    <div className="line">
                      <span className="text-purple-400">import</span> {'{'} App {'}'}{' '}
                      <span className="text-purple-400">from</span>{' '}
                      <span className="text-green-400">'./app'</span>
                    </div>
                    <div className="line h-4"></div>
                    <div className="line">
                      <span className="text-gray-500">{'// Initialize Zenith with your app'}</span>
                    </div>
                    <div className="line">
                      <span className="text-blue-400">const</span> zenith ={' '}
                      <span className="text-purple-400">new</span> Zenith(App)
                    </div>
                    <div className="line h-4"></div>
                    <div className="line">
                      <span className="text-gray-500">{'// Mount the dashboard'}</span>
                    </div>
                    <div className="line">
                      zenith.mount(<span className="text-green-400">"/admin/zenith"</span>)
                    </div>
                    <div className="line h-4"></div>
                    <div className="line">
                      <span className="text-gray-500">{'// Start the control plane'}</span>
                    </div>
                    <div className="line">
                      <span className="text-purple-400">await</span> zenith.start()
                    </div>
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 bg-black/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-gray-400">
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-bold text-white">ZENITH</span>
            <span>&copy; 2026 Gravito. All rights reserved.</span>
          </div>
          <div className="flex gap-6 text-gray-400 text-sm">
            <a href="/" className="hover:text-white transition-colors">
              Privacy Policy
            </a>
            <a href="/" className="hover:text-white transition-colors">
              Terms of Service
            </a>
            <a href="/" className="hover:text-white transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="p-6 rounded-lg bg-white/5 border border-white/5 hover:border-zenith-500/50 hover:bg-white/10 transition-all group">
      <div className="w-12 h-12 rounded bg-zenith-500/20 flex items-center justify-center text-zenith-400 mb-4 group-hover:text-zenith-accent group-hover:scale-110 transition-all">
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
          className: 'w-6 h-6',
        })}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </div>
  )
}

function ListItem({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-3 text-gray-300">
      <div className="w-5 h-5 rounded-full bg-zenith-500/20 flex items-center justify-center text-zenith-400 flex-shrink-0">
        <Zap className="w-3 h-3" />
      </div>
      {text}
    </li>
  )
}

import { usePage } from '@inertiajs/react'
import { motion } from 'framer-motion'
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BookOpen,
  Clock,
  Database,
  Github,
  Globe,
  HardDrive,
  LayoutDashboard,
  ListTree,
  Search,
  Server,
  Zap,
} from 'lucide-react'
import React from 'react'
import { Footer } from '../components/Footer'
import { Navbar } from '../components/Navbar'
import { StaticLink } from '../components/StaticLink'
import { useTrans } from '../hooks/useTrans'

interface HomeProps {
  [key: string]: unknown
  t?: any
  locale?: string
  version?: string
}

export default function Home() {
  const { trans, locale } = useTrans()
  const props = usePage<HomeProps>().props
  return (
    <div className="min-h-screen bg-zenith-void text-white selection:bg-zenith-accent selection:text-zenith-900 overflow-x-hidden font-sans">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-20">
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-60 scale-105"
            style={{ backgroundImage: 'url("/images/hero_bg.png")' }}
          />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-zenith-500/20 rounded-full blur-[120px] -translate-y-1/2 animate-pulse" />
          <div className="absolute inset-0 bg-gradient-to-b from-zenith-void via-transparent to-zenith-void" />
          <div className="absolute inset-0 bg-gradient-to-r from-zenith-void/80 via-transparent to-zenith-void/80" />
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0, 240, 255, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 240, 255, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
            }}
          />
          <div className="absolute inset-0">
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-zenith-accent/40 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  opacity: [0, 0.8, 0],
                  scale: [0.5, 1.2, 0.5],
                }}
                transition={{
                  duration: 2 + Math.random() * 4,
                  repeat: Infinity,
                  delay: Math.random() * 5,
                }}
              />
            ))}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
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
                  {trans('hero.status')}
                </div>
                <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight">
                  {trans('hero.title')} <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-zenith-400 to-zenith-accent">
                    {trans('hero.titleHighlight')}
                  </span>
                </h1>
                <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                  {trans('hero.description')}
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                  <button
                    type="button"
                    className="w-full sm:w-auto px-8 py-3 bg-zenith-500 hover:bg-zenith-400 text-white rounded font-medium transition-all shadow-lg shadow-zenith-500/25 flex items-center justify-center gap-2 group"
                  >
                    {trans('hero.getStarted')}{' '}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button
                    type="button"
                    className="w-full sm:w-auto px-8 py-3 bg-transparent border border-white/20 hover:bg-white/5 text-white rounded font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" /> {trans('hero.documentation')}
                  </button>
                </div>
              </motion.div>
            </div>

            <div className="flex-1 w-full max-w-2xl lg:max-w-none relative z-10">
              <div className="absolute -inset-10 bg-zenith-500/20 rounded-full blur-3xl opacity-40 animate-pulse" />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                className="relative rounded-2xl border border-white/10 bg-[#0A0A14]/60 backdrop-blur-2xl p-6 shadow-[0_0_80px_rgba(0,240,255,0.15)] overflow-hidden"
              >
                <div
                  className="absolute top-0 right-0 w-64 h-64 bg-cover opacity-10 mix-blend-overlay pointer-events-none"
                  style={{ backgroundImage: 'url("/images/hud_detail.png")' }}
                />
                <div className="absolute inset-0 rounded-2xl border border-zenith-accent/20" />
                <motion.div
                  className="absolute inset-[1px] rounded-2xl"
                  style={{
                    background:
                      'linear-gradient(135deg, transparent 40%, rgba(0,240,255,0.1) 50%, transparent 60%)',
                    backgroundSize: '300% 300%',
                  }}
                  animate={{
                    backgroundPosition: ['0% 0%', '100% 100%'],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
                <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                    <div className="text-xs text-gray-400 font-mono">zenith.local</div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-16 bg-white/5 rounded-lg p-2 border border-white/10">
                    <div className="space-y-2">
                      {[
                        { icon: LayoutDashboard, active: true },
                        { icon: ListTree, active: false },
                        { icon: Clock, active: false },
                        { icon: HardDrive, active: false },
                      ].map((item, i) => {
                        const IconComponent = item.icon
                        return (
                          <div
                            key={i}
                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              item.active
                                ? 'bg-zenith-500/30 border border-zenith-500/50 text-zenith-accent'
                                : 'bg-white/5 hover:bg-white/10 text-gray-400'
                            } transition-all`}
                          >
                            <IconComponent size={18} />
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                          Throughput
                        </div>
                        <div className="text-lg font-mono font-bold text-zenith-accent">12.4K</div>
                        <div className="text-[9px] text-gray-500">ops/sec</div>
                      </div>
                      <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                          Workers
                        </div>
                        <div className="text-lg font-mono font-bold text-green-400">48</div>
                        <div className="text-[9px] text-gray-500">online</div>
                      </div>
                      <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                          Queues
                        </div>
                        <div className="text-lg font-mono font-bold text-blue-400">24</div>
                        <div className="text-[9px] text-gray-500">active</div>
                      </div>
                    </div>

                    <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider">
                          Pipeline Load
                        </div>
                        <div className="flex gap-1">
                          {[0.3, 0.6, 0.9, 1].map((o, i) => (
                            <div
                              key={i}
                              className="w-1.5 h-1.5 rounded-sm bg-zenith-accent"
                              style={{ opacity: o }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-8 gap-1">
                        {[0.2, 0.5, 0.8, 0.3, 0.9, 0.4, 0.7, 0.6].map((load, i) => (
                          <div
                            key={i}
                            className="aspect-square rounded-sm bg-zenith-accent/20 border border-zenith-accent/30"
                            style={{
                              backgroundColor: `rgba(59, 130, 246, ${0.1 + load * 0.9})`,
                              boxShadow:
                                load > 0.7 ? `0 0 8px rgba(59, 130, 246, ${load})` : 'none',
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider">
                          Active Queues
                        </div>
                        <div className="text-[9px] text-zenith-500">View All →</div>
                      </div>
                      <div className="space-y-1.5">
                        {[
                          { name: 'emails.transactional', jobs: 1247, status: 'active' },
                          { name: 'images.process', jobs: 892, status: 'active' },
                        ].map((q) => (
                          <div
                            key={q.name}
                            className="flex items-center justify-between p-1.5 bg-black/30 rounded text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${
                                  q.status === 'active'
                                    ? 'bg-green-400 animate-pulse'
                                    : 'bg-gray-500'
                                }`}
                              />
                              <span className="font-mono text-gray-300 text-[10px]">{q.name}</span>
                            </div>
                            <span className="text-[9px] text-gray-500 font-mono">{q.jobs}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-zenith-stellar/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-zenith-stellar/50">
                {trans('features.title')}
              </span>
            </h2>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">{trans('features.subtitle')}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Activity />}
              title={trans('features.realtimeMonitoring.title')}
              description={trans('features.realtimeMonitoring.description')}
            />
            <FeatureCard
              icon={<Server />}
              title={trans('features.queueManagement.title')}
              description={trans('features.queueManagement.description')}
            />
            <FeatureCard
              icon={<Search />}
              title={trans('features.jobAuditing.title')}
              description={trans('features.jobAuditing.description')}
            />
            <FeatureCard
              icon={<Database />}
              title={trans('features.dlqOperations.title')}
              description={trans('features.dlqOperations.description')}
            />
            <FeatureCard
              icon={<AlertCircle />}
              title={trans('features.automatedAlerting.title')}
              description={trans('features.automatedAlerting.description')}
            />
            <FeatureCard
              icon={<Clock />}
              title={trans('features.scheduleManagement.title')}
              description={trans('features.scheduleManagement.description')}
            />
          </div>
        </div>
      </section>

      {/* UI Showcase Section */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              {locale === 'zh-TW' ? '實際介面展示' : 'See It In Action'}
            </h2>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              {locale === 'zh-TW'
                ? '探索 Zenith 的實際控制面板，體驗零配置的隊列管理'
                : "Explore Zenith's actual control plane and experience zero-config queue management"}
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 mb-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-zenith-void/40 rounded-2xl border border-white/5 p-8 backdrop-blur-md shadow-2xl relative group overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-zenith-pulse/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="p-2 rounded-lg bg-zenith-pulse/10 text-zenith-pulse">
                  <ListTree className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight">
                  {locale === 'zh-TW' ? '隊列管理' : 'Queue Management'}
                </h3>
              </div>
              <p className="text-gray-300 text-base mb-8 relative z-10 leading-relaxed">
                {locale === 'zh-TW'
                  ? '即時查看所有隊列狀態，暫停/恢復隊列，檢查等待、延遲和失敗的任務'
                  : 'View all queue statuses in real-time, pause/resume queues, and inspect waiting, delayed, and failed jobs'}
              </p>
              <div className="space-y-3 bg-black/40 rounded-xl p-6 border border-white/5 relative z-10">
                {[
                  { name: 'emails.transactional', waiting: 1247, failed: 2 },
                  { name: 'images.process', waiting: 892, failed: 0 },
                ].map((q) => (
                  <div
                    key={q.name}
                    className="flex items-center justify-between p-4 bg-white/[0.03] rounded-xl border border-white/5 hover:bg-white/[0.08] transition-all"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)] animate-pulse"></div>
                        <span className="font-mono text-sm text-gray-200">{q.name}</span>
                      </div>
                      <div className="flex gap-4 text-xs text-gray-400 mt-2">
                        <span>
                          Waiting: <span className="text-zenith-accent font-bold">{q.waiting}</span>
                        </span>
                        <span>
                          Failed: <span className="text-red-400 font-bold">{q.failed}</span>
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="px-4 py-2 bg-zenith-pulse/10 hover:bg-zenith-pulse/20 rounded-lg text-xs font-bold text-zenith-pulse border border-zenith-pulse/20 transition-all"
                    >
                      {locale === 'zh-TW' ? '查看' : 'Inspect'}
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-zenith-void/40 rounded-2xl border border-white/5 p-8 backdrop-blur-md shadow-2xl relative group overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="p-2 rounded-lg bg-green-400/10 text-green-400">
                  <Server className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight">
                  {locale === 'zh-TW' ? 'Worker 監控' : 'Worker Monitoring'}
                </h3>
              </div>
              <p className="text-gray-300 text-base mb-8 relative z-10 leading-relaxed">
                {locale === 'zh-TW'
                  ? '即時監控 Worker 節點的 CPU、RAM 使用率和健康狀態'
                  : 'Monitor worker nodes in real-time with live CPU, RAM metrics, and health status'}
              </p>
              <div className="space-y-4 bg-black/40 rounded-xl p-6 border border-white/5 relative z-10">
                {[{ id: 'worker-42', cpu: 45, ram: 68 }].map((w) => (
                  <div key={w.id} className="p-4 bg-white/[0.03] rounded-xl border border-white/5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                        <span className="font-mono text-sm text-gray-200">{w.id}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 bg-green-400/10 text-green-400 rounded-full border border-green-400/20 uppercase font-black">
                        Healthy
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-[10px] text-gray-500 uppercase tracking-tighter mb-1.5">
                          <span>CPU Load</span>
                          <span className="text-white font-bold">{w.cpu}%</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${w.cpu}%` }}
                            className="h-full bg-zenith-accent rounded-full"
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-gray-500 uppercase tracking-tighter mb-1.5">
                          <span>Memory Usage</span>
                          <span className="text-white font-bold">{w.ram}%</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${w.ram}%` }}
                            className="h-full bg-green-400 rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white/5 rounded-2xl border border-white/10 p-6 hover:bg-white/10 transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-6 h-6 text-zenith-accent" />
                <h4 className="font-bold">
                  {locale === 'zh-TW' ? '排程管理' : 'Schedule Management'}
                </h4>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                {locale === 'zh-TW'
                  ? '完整的 Cron 任務 UI，管理排程任務並查看執行歷史'
                  : 'Full UI for Cron jobs. Manage scheduled tasks and view execution history'}
              </p>
              <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-mono text-gray-300">0 */5 * * *</span>
                  <span className="text-green-400">Active</span>
                </div>
                <div className="text-[10px] text-gray-400">
                  {locale === 'zh-TW' ? '每 5 分鐘執行一次' : 'Runs every 5 minutes'}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white/5 rounded-2xl border border-white/10 p-6 hover:bg-white/10 transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <Search className="w-6 h-6 text-zenith-pulse" />
                <h4 className="font-bold">{locale === 'zh-TW' ? '任務審計' : 'Job Auditing'}</h4>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                {locale === 'zh-TW'
                  ? '透過 SQL 永久歷史記錄和全局搜索，同時查詢 Redis 和 SQL'
                  : 'Permanent history via SQL with global search. Query both Redis and SQL simultaneously'}
              </p>
              <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                <div className="flex items-center gap-2 text-xs mb-2">
                  <Search className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-300 font-mono">search: "payment"</span>
                </div>
                <div className="text-[10px] text-gray-400">
                  {locale === 'zh-TW' ? '找到 1,247 個結果' : 'Found 1,247 results'}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-white/5 rounded-2xl border border-white/10 p-6 hover:bg-white/10 transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <AlertCircle className="w-6 h-6 text-yellow-500" />
                <h4 className="font-bold">
                  {locale === 'zh-TW' ? '自動化警報' : 'Automated Alerting'}
                </h4>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                {locale === 'zh-TW'
                  ? 'Slack 通知失敗激增或積壓問題，即時檢查並具有冷卻邏輯'
                  : 'Slack notifications for failure spikes or backlog issues with real-time checks and cool-down logic'}
              </p>
              <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                <div className="flex items-center gap-2 text-xs mb-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                  <span className="text-gray-300">
                    {locale === 'zh-TW' ? '警告：隊列積壓' : 'Alert: Queue Backlog'}
                  </span>
                </div>
                <div className="text-[10px] text-gray-400">
                  {locale === 'zh-TW' ? '已發送到 Slack' : 'Sent to Slack'}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Code Snippet Section */}
      <section className="py-24 border-t border-white/5 relative overflow-hidden">
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-zenith-stellar/10 blur-[100px] rounded-full -translate-x-1/2" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1">
              <h2 className="text-4xl font-bold mb-6 tracking-tight">
                {trans('integration.title')}
              </h2>
              <p className="text-gray-300 mb-8 text-lg leading-relaxed">
                {trans('integration.description')}
              </p>

              <ul className="grid sm:grid-cols-2 gap-4">
                <ListItem text={trans('integration.features.autoDiscovery')} />
                <ListItem text={trans('integration.features.sqliteSupport')} />
                <ListItem text={trans('integration.features.workerHealth')} />
                <ListItem text={trans('integration.features.logArchiving')} />
                <ListItem text={trans('integration.features.batchActions')} />
                <ListItem text={trans('integration.features.hybridSearch')} />
              </ul>
            </div>

            <div className="flex-1 w-full relative">
              <div className="absolute -inset-4 bg-zenith-pulse/20 blur-2xl rounded-2xl opacity-30" />
              <div className="relative bg-[#050510] rounded-2xl border border-white/10 p-8 font-mono text-sm overflow-x-auto shadow-2xl">
                <div className="flex gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-500/30" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/30" />
                  <div className="w-3 h-3 rounded-full bg-green-500/30" />
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

      <Footer />
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
    <motion.div
      whileHover={{ y: -5 }}
      className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-zenith-stellar/30 hover:bg-white/[0.05] transition-all duration-300 group relative"
    >
      <div className="absolute top-4 right-4 w-1 h-1 rounded-full bg-zenith-stellar opacity-20 group-hover:opacity-100 group-hover:scale-[3] transition-all" />

      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-zenith-500/10 to-zenith-stellar/10 flex items-center justify-center text-zenith-400 mb-6 group-hover:scale-110 group-hover:text-zenith-accent transition-all duration-300 border border-white/5">
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
          className: 'w-7 h-7',
        })}
      </div>
      <h3 className="text-xl font-bold mb-3 text-white/90 group-hover:text-white transition-colors">
        {title}
      </h3>
      <p className="text-gray-300 leading-relaxed text-sm">{description}</p>
    </motion.div>
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

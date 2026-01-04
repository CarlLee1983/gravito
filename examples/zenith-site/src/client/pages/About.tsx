import { Head, usePage } from '@inertiajs/react'
import { Activity, AlertCircle, Clock, Database, Globe, Search, Server } from 'lucide-react'
import Layout from '../components/Layout'
import { useTrans } from '../hooks/useTrans'
import { StaticLink } from '../components/StaticLink'

interface AboutProps {
  t?: any
  locale?: string
  version?: string
}

export default function About() {
  const { trans, locale } = useTrans()
  const props = usePage<AboutProps>().props

  return (
    <Layout>
      <Head title={`${trans('about.title')} ${trans('about.titleHighlight')} - Gravito Control Plane`} />

      <div className="min-h-screen bg-zenith-900 text-white">
        {/* Language Switcher - Fixed Position */}
        <div className="fixed top-4 right-4 z-50">
          <div className="relative group">
            <button
              type="button"
              className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-1 bg-zenith-800/80 backdrop-blur-md border border-white/10"
            >
              <Globe className="w-5 h-5" />
              <span className="text-xs font-mono">{locale === 'zh-TW' ? '繁中' : 'EN'}</span>
            </button>
            <div className="absolute right-0 top-full mt-2 w-32 bg-zenith-800 border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <StaticLink
                href={locale === 'zh-TW' ? '/' : '/zh-TW'}
                className="block px-4 py-2 text-sm hover:bg-white/10 transition-colors text-left"
              >
                {locale === 'zh-TW' ? 'English' : '繁體中文'}
              </StaticLink>
              <StaticLink
                href={locale === 'zh-TW' ? '/about' : '/zh-TW/about'}
                className="block px-4 py-2 text-sm hover:bg-white/10 transition-colors text-left border-t border-white/5"
              >
                {locale === 'zh-TW' ? 'About (EN)' : '關於 (繁中)'}
              </StaticLink>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <header className="text-center mb-12">
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">
              {trans('about.title')}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-zenith-400 to-zenith-accent">
                {trans('about.titleHighlight')}
              </span>
            </h1>
            <p className="text-gray-400 text-lg">
              {locale === 'zh-TW' ? '版本' : 'Version'} {props.version || '0.1.0'}
            </p>
          </header>

          <div className="space-y-12">
            {/* Overview */}
            <section>
              <h2 className="text-2xl font-bold mb-4">{trans('about.whatIs')}</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                <strong>Gravito Zenith</strong> {trans('about.whatIsDescription1')}
              </p>
              <p className="text-gray-300 leading-relaxed">
                {trans('about.whatIsDescription2')}
              </p>
            </section>

            {/* Core Features */}
            <section>
              <h2 className="text-2xl font-bold mb-6">{trans('about.coreFeatures')}</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <FeatureItem
                  icon={<Activity className="w-5 h-5" />}
                  title={trans('features.realtimeMonitoring.title')}
                  description={trans('features.realtimeMonitoring.description')}
                />
                <FeatureItem
                  icon={<Server className="w-5 h-5" />}
                  title={trans('features.queueManagement.title')}
                  description={trans('features.queueManagement.description')}
                />
                <FeatureItem
                  icon={<Search className="w-5 h-5" />}
                  title={trans('features.jobAuditing.title')}
                  description={trans('features.jobAuditing.description')}
                />
                <FeatureItem
                  icon={<Database className="w-5 h-5" />}
                  title={trans('features.dlqOperations.title')}
                  description={trans('features.dlqOperations.description')}
                />
                <FeatureItem
                  icon={<AlertCircle className="w-5 h-5" />}
                  title={trans('features.automatedAlerting.title')}
                  description={trans('features.automatedAlerting.description')}
                />
                <FeatureItem
                  icon={<Clock className="w-5 h-5" />}
                  title={trans('features.scheduleManagement.title')}
                  description={trans('features.scheduleManagement.description')}
                />
              </div>
            </section>

            {/* Technical Specifications */}
            <section>
              <h2 className="text-2xl font-bold mb-4">{trans('about.technicalSpecs')}</h2>
              <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-3">{trans('about.backend')}</h3>
                <ul className="space-y-2 text-gray-300 mb-6">
                  <li>• <strong>{locale === 'zh-TW' ? '運行時：' : 'Runtime:'}</strong> Bun / Node.js ({locale === 'zh-TW' ? '相容' : 'Compatible'})</li>
                  <li>• <strong>{locale === 'zh-TW' ? '框架：' : 'Framework:'}</strong> @gravito/photon ({locale === 'zh-TW' ? 'Hono 包裝器' : 'Hono wrapper'})</li>
                  <li>• <strong>{locale === 'zh-TW' ? '資料存取：' : 'Data Access:'}</strong> @gravito/stream ({locale === 'zh-TW' ? '直接使用 QueueDriver' : 'Direct QueueDriver usage'})</li>
                  <li>• <strong>{locale === 'zh-TW' ? '持久化：' : 'Persistence:'}</strong> MySQLPersistence / SQLitePersistence ({locale === 'zh-TW' ? '長期審計用' : 'for long-term auditing'})</li>
                </ul>

                <h3 className="text-lg font-semibold mb-3">{trans('about.frontend')}</h3>
                <ul className="space-y-2 text-gray-300 mb-6">
                  <li>• <strong>{locale === 'zh-TW' ? '框架：' : 'Framework:'}</strong> React 19</li>
                  <li>• <strong>{locale === 'zh-TW' ? '建置工具：' : 'Build Tool:'}</strong> Vite</li>
                  <li>• <strong>{locale === 'zh-TW' ? '樣式：' : 'Styling:'}</strong> TailwindCSS</li>
                  <li>• <strong>{locale === 'zh-TW' ? '狀態管理：' : 'State Management:'}</strong> React Query ({locale === 'zh-TW' ? 'TanStack Query，用於即時輪詢' : 'TanStack Query for real-time polling'})</li>
                </ul>

                <h3 className="text-lg font-semibold mb-3">{trans('about.deployment')}</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• <strong>{locale === 'zh-TW' ? '零配置：' : 'Zero-Config:'}</strong> {locale === 'zh-TW' ? '內建 SQLite 支援，本地審計無需資料庫伺服器' : 'Built-in SQLite support for local auditing without a DB server'}</li>
                  <li>• <strong>{locale === 'zh-TW' ? '無狀態：' : 'Stateless:'}</strong> {locale === 'zh-TW' ? '控制台不保存長期狀態；Redis 是真相來源' : 'Console holds no long-term state; Redis is the source of truth'}</li>
                  <li>• <strong>{locale === 'zh-TW' ? '基礎架構：' : 'Infrastructure:'}</strong> {locale === 'zh-TW' ? '需要 Redis 6.0+ 進行狀態協調' : 'Requires Redis 6.0+ for state coordination'}</li>
                </ul>
              </div>
            </section>

            {/* Additional Features */}
            <section>
              <h2 className="text-2xl font-bold mb-4">{trans('about.additionalCapabilities')}</h2>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start gap-3">
                  <span className="text-zenith-accent mt-1">✓</span>
                  <span>
                    <strong>{trans('about.dlqOperations')}</strong> {trans('about.dlqOperationsDesc')}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-zenith-accent mt-1">✓</span>
                  <span>
                    <strong>{trans('about.logArchiving')}</strong> {trans('about.logArchivingDesc')}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-zenith-accent mt-1">✓</span>
                  <span>
                    <strong>{trans('about.batchActions')}</strong> {trans('about.batchActionsDesc')}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-zenith-accent mt-1">✓</span>
                  <span>
                    <strong>{trans('about.retentionManagement')}</strong> {trans('about.retentionManagementDesc')}
                  </span>
                </li>
              </ul>
            </section>

            {/* Back to Home */}
            <div className="pt-8 border-t border-white/10">
              <StaticLink
                href={locale === 'zh-TW' ? '/zh-TW' : '/'}
                className="inline-flex items-center gap-2 text-zenith-400 hover:text-zenith-accent transition-colors"
              >
                {trans('about.backToHome')}
              </StaticLink>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex gap-4">
      <div className="w-10 h-10 rounded bg-zenith-500/20 flex items-center justify-center text-zenith-400 flex-shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold mb-1">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

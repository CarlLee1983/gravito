import { Head, useForm, usePage } from '@inertiajs/react'
import { useState } from 'react'
import Layout from '../components/Layout'
import { useTrans } from '../hooks/useTrans'

export default function Home() {
  const { trans } = useTrans()
  const { locale } = usePage().props as any

  const { data, setData, post, processing, errors, reset } = useForm({
    email: '',
  })

  const [success, setSuccess] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    post('/newsletter', {
      onSuccess: () => {
        setSuccess(true)
        reset()
      },
    })
  }

  const currentLang = locale || 'en'
  const docsLink = currentLang === 'zh' ? '/zh/docs' : '/docs'

  // Build page title safely
  const pageTitle =
    `${trans('hero.title_prefix', 'Gravito')} ${trans('hero.title_suffix', 'Framework')}`.trim()

  return (
    <Layout>
      {/* IMPORTANT: Use title prop, NOT <title> child element */}
      <Head title={pageTitle} />

      {/* Hero Section */}
      <section className="relative px-6 py-24 md:py-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-400/20 blur-[100px] rounded-full -z-10 opacity-50 pointer-events-none" />

        <div className="container mx-auto text-center max-w-4xl">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium mb-8 border border-blue-100 dark:border-blue-800">
            <span className="flex size-2 rounded-full bg-blue-500 mr-2 animate-pulse" />
            {trans('hero.v1_badge', 'v1.0 is now available')}
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
            {trans('hero.title_prefix', 'The High-Performance Framework for')}{' '}
            <span className="text-blue-600 dark:text-blue-400">
              {trans('hero.title_suffix', 'Artisans')}
            </span>
            .
          </h1>

          <p className="text-xl md:text-2xl text-gray-500 dark:text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            {trans('hero.subtitle', 'Build faster with Bun. Scale simpler with Binary deployment.')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={docsLink}
              className="px-8 py-4 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/25 active:scale-95"
            >
              {trans('hero.cta_start', 'Get Started')}
            </a>
            <a
              href="https://github.com/CarlLee1983/gravito"
              className="px-8 py-4 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95"
            >
              {trans('hero.cta_github', 'View on GitHub')}
            </a>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-6 py-20 bg-gray-50 dark:bg-gray-900/50">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              title={trans('features.fast_title', 'Blazing Fast')}
              icon="⚡"
              desc={trans('features.fast_desc', 'Powered by Bun runtime.')}
            />
            <FeatureCard
              title={trans('features.light_title', 'Binary First')}
              icon="📦"
              desc={trans('features.light_desc', 'Single binary deployment.')}
            />
            <FeatureCard
              title={trans('features.clean_title', 'MVC Structure')}
              icon="🏛️"
              desc={trans('features.clean_desc', 'Clean architecture.')}
            />
          </div>
        </div>
      </section>

      {/* Newsletter Interaction */}
      <section className="px-6 py-24">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold mb-4">
            {trans('newsletter.title', 'Stay in the Loop')}
          </h2>
          <p className="text-gray-500 mb-8">
            {trans('newsletter.desc', 'Get updates on new releases.')}
          </p>

          {success ? (
            <div className="p-6 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl border border-green-100 dark:border-green-800">
              <span className="text-2xl mr-2">🎉</span>
              <strong>{trans('newsletter.success', 'Subscribed!')}</strong>
            </div>
          ) : (
            <form onSubmit={submit} className="relative">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={data.email}
                  onChange={(e) => setData('email', e.target.value)}
                  placeholder={trans('newsletter.placeholder', 'Email address')}
                  className="flex-1 px-5 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  required
                />
                <button
                  type="submit"
                  disabled={processing}
                  className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {processing
                    ? trans('newsletter.processing', '...')
                    : trans('newsletter.button', 'Subscribe')}
                </button>
              </div>
              {errors.email && (
                <p className="text-red-500 text-sm mt-2 text-left">{errors.email}</p>
              )}
            </form>
          )}
        </div>
      </section>
    </Layout>
  )
}

function FeatureCard({ title, desc, icon }: { title: string; desc: string; icon: string }) {
  return (
    <div className="p-8 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
    </div>
  )
}

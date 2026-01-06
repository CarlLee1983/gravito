import { Head } from '@inertiajs/react'
import { FileText, Globe, Scale } from 'lucide-react'
import Layout from '../components/Layout'
import { useTrans } from '../hooks/useTrans'

export default function Terms() {
  const { trans } = useTrans()

  return (
    <Layout>
      <Head>
        <title>{trans('legal.terms.title')} | Gravito Framework</title>
      </Head>

      <section className="relative pt-32 pb-20 overflow-hidden bg-void min-h-screen">
        {/* Celestial Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-1/2 translate-x-1/2 w-[1000px] h-[600px] bg-singularity/10 rounded-full blur-[120px] -translate-y-1/2" />
        </div>

        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h1 className="text-5xl lg:text-7xl font-black italic tracking-tighter mb-4 text-white uppercase">
              {trans('legal.terms.title')}
            </h1>
            <p className="text-singularity font-mono text-xs uppercase tracking-[0.3em]">
              {trans('legal.terms.lastUpdated')}
            </p>
          </div>

          <div className="space-y-12">
            {/* Section 1 */}
            <div className="group p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 backdrop-blur-3xl hover:border-singularity/30 transition-all duration-500">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl bg-singularity/10 text-singularity group-hover:scale-110 transition-transform">
                  <Globe size={24} />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  {trans('legal.terms.section1.title')}
                </h2>
              </div>
              <p className="text-gray-400 leading-relaxed text-lg">
                {trans('legal.terms.section1.content')}
              </p>
            </div>

            {/* Section 2 */}
            <div className="group p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 backdrop-blur-3xl hover:border-singularity/30 transition-all duration-500">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl bg-singularity/10 text-singularity group-hover:scale-110 transition-transform">
                  <Scale size={24} />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  {trans('legal.terms.section2.title')}
                </h2>
              </div>
              <p className="text-gray-400 leading-relaxed text-lg">
                {trans('legal.terms.section2.content')}
              </p>
            </div>

            {/* Section 3 */}
            <div className="group p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 backdrop-blur-3xl hover:border-singularity/30 transition-all duration-500">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl bg-singularity/10 text-singularity group-hover:scale-110 transition-transform">
                  <FileText size={24} />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  {trans('legal.terms.section3.title')}
                </h2>
              </div>
              <p className="text-gray-400 leading-relaxed text-lg">
                {trans('legal.terms.section3.content')}
              </p>
            </div>
          </div>

          <div className="mt-20 p-8 rounded-[2rem] bg-singularity/5 border border-singularity/10 text-center">
            <p className="text-sm font-mono text-singularity uppercase tracking-widest">
              MIT License Agreement {'//'} {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </section>
    </Layout>
  )
}

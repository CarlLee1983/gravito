import { Head } from '@inertiajs/react'
import { motion } from 'framer-motion'
import { Scale, Shield } from 'lucide-react'
import { DocsLayout } from '../components/DocsLayout'

interface LegalProps {
  title: string
  content: string
  id: string
  slug: string
  lastUpdated: string
  lang?: 'en' | 'zh-TW'
}

export default function Legal({ title, content, id, slug, lastUpdated, lang = 'en' }: LegalProps) {
  const t = {
    en: {
      breadcrumb: 'HOME',
      compliance: 'LEGAL_COMPLIANCE_v1.0',
      mod_id: 'MOD_ID',
      last_update: 'LAST_UPDATE',
      disclaimer_title: 'Legal Disclaimer',
      disclaimer_text:
        'This document is part of the Gravito Research Labs legal framework. Photon Engine is provided "as is" without warranty. For specific commercial licensing, please contact our enterprise relations module.',
    },
    'zh-TW': {
      breadcrumb: '首頁',
      compliance: '法律合規性_v1.0',
      mod_id: '模組編號',
      last_update: '最後更新',
      disclaimer_title: '法律免責聲明',
      disclaimer_text:
        '本文件屬 Gravito 研究實驗室法律框架之一部分。Photon Engine 按「原樣」提供，不提供任何保證。如需特定的商業授權，請聯繫我們的企業關係模組。',
    },
  }[lang]

  return (
    <DocsLayout currentId={slug}>
      <Head title={`${title} // LEGAL_PROTOCOL`} />

      <div className="bg-p-bg transition-colors duration-500">
        <header className="max-w-4xl mx-auto mb-20 px-4 pt-16 relative z-10 text-center">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-surf-bg border border-s-brd rounded-sm mb-8">
            <Shield size={14} className="text-photon-gold" />
            <span className="text-[10px] font-technical text-m-txt tracking-[0.4em] uppercase">
              {t.compliance}
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-p-txt uppercase tracking-tighter mb-8 leading-tight">
            {title}
          </h1>

          <div className="flex justify-center items-center gap-6 text-[10px] font-technical text-m-txt uppercase tracking-widest">
            <span>
              {t.mod_id}: {id}
            </span>
            <div className="w-1 h-1 bg-s-brd rounded-full" />
            <span>
              {t.last_update}: {lastUpdated}
            </span>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 pb-40">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="photon-prose"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted content
            dangerouslySetInnerHTML={{ __html: content }}
          />

          <div className="mt-32 p-12 border border-s-brd bg-s-bg flex items-start gap-8">
            <Scale size={24} className="text-photon-gold opacity-40 shrink-0" />
            <div>
              <h5 className="text-p-txt text-xs font-bold uppercase mb-2">{t.disclaimer_title}</h5>
              <p className="text-s-txt text-[11px] leading-relaxed">{t.disclaimer_text}</p>
            </div>
          </div>
        </div>
      </div>
    </DocsLayout>
  )
}

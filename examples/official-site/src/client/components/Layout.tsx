import { usePage } from '@inertiajs/react'
import { useTrans } from '../hooks/useTrans'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { trans } = useTrans()
  const { locale } = usePage().props as any

  const currentLang = locale || 'en'

  const getLocalizedPath = (path: string) => {
    if (currentLang === 'zh') {
      if (path === '/') return '/zh/'
      return `/zh${path}`
    }
    return path
  }

  const switchLocale = (newLang: string) => {
    const path = window.location.pathname
    if (newLang === 'zh') {
      if (path.startsWith('/zh')) return path
      if (path === '/') return '/zh/'
      return `/zh${path}`
    }
    if (newLang === 'en') {
      if (!path.startsWith('/zh')) return path
      const newPath = path.replace(/^\/zh/, '')
      return newPath || '/'
    }
    return path
  }

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Navbar */}
      <header className="fixed w-full z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <a href={getLocalizedPath('/')} className="flex items-center space-x-2 group">
            <div className="size-8 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 group-hover:scale-110 transition-transform duration-300" />
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
              Gravito
            </span>
          </a>

          {/* Navigation */}
          <nav className="flex items-center space-x-6">
            <a
              href={getLocalizedPath('/docs')}
              className="text-sm font-medium text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors"
            >
              {trans('nav.docs', 'Docs')}
            </a>
            <a
              href="https://github.com/CarlLee1983/gravito"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors"
            >
              {trans('nav.github', 'GitHub')}
            </a>

            {/* Language Switcher */}
            <div className="border-l pl-6 border-gray-200 dark:border-gray-700 flex space-x-2 text-sm">
              <a
                href={switchLocale('en')}
                className={`font-medium ${currentLang === 'en' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                EN
              </a>
              <a
                href={switchLocale('zh')}
                className={`font-medium ${currentLang === 'zh' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                中
              </a>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-16">{children}</main>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800">
        <div className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-lg font-bold mb-4">Gravito</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                {trans('footer.desc', 'The High-Performance Framework for Artisans.')}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">{trans('footer.links', 'Links')}</h4>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <li>
                  <a href={getLocalizedPath('/')} className="hover:text-blue-500">
                    {trans('footer.home', 'Home')}
                  </a>
                </li>
                <li>
                  <a href={getLocalizedPath('/docs')} className="hover:text-blue-500">
                    {trans('nav.docs', 'Docs')}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">{trans('footer.connect', 'Connect')}</h4>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <li>
                  <a
                    href="https://twitter.com"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-blue-500"
                  >
                    Twitter
                  </a>
                </li>
                <li>
                  <a
                    href="https://discord.com"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-blue-500"
                  >
                    Discord
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800 text-center text-sm text-gray-400">
            &copy; {new Date().getFullYear()} {trans('footer.copyright', 'Gravito Framework')}
          </div>
        </div>
      </footer>
    </div>
  )
}

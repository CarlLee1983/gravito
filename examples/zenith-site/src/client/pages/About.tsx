import { Head } from '@inertiajs/react'
import Layout from '../components/Layout'
import { StaticLink } from '../components/StaticLink'

export default function About({ version }: { version: string }) {
  return (
    <Layout>
      <Head title="About - Gravito Static Site" />

      <div className="container" style={{ textAlign: 'center', padding: '2rem' }}>
        <header>
          <h1>About This Static Site</h1>
          <p className="tagline">Version {version}</p>
        </header>

        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'left' }}>
          <h2>Built with Gravito</h2>
          <p>
            This is a static site generated with Gravito + Inertia.js + React. It can be deployed to
            GitHub Pages, Vercel, Netlify, or any static hosting provider.
          </p>

          <h3>Key Features</h3>
          <ul>
            <li>✅ Uses StaticLink for proper navigation in static environments</li>
            <li>✅ Automatic detection of static vs dynamic environments</li>
            <li>✅ Full page navigation in production, SPA navigation in development</li>
            <li>✅ Pre-configured build script for static site generation</li>
          </ul>

          <div style={{ marginTop: '2rem' }}>
            <StaticLink href="/" className="endpoint">
              ← Back to Home
            </StaticLink>
          </div>
        </div>
      </div>
    </Layout>
  )
}

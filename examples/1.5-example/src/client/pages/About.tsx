import { Head } from '@inertiajs/react'

import Layout from '../components/Layout'

export default function About() {
  return (
    <Layout>
      <Head title="About - Gravito" />

      <div className="container" style={{ textAlign: 'center' }}>
        <div className="features">
          <h2>✨ Why Gravito?</h2>

          <div className="feature-grid">
            <div className="feature-card">
              <span className="icon">⚡️</span>
              <h3>Super Fast</h3>
              <p>Powered by Bun and Hono for extreme performance.</p>
            </div>
            <div className="feature-card">
              <span className="icon">⚛️</span>
              <h3>Modern Stack</h3>
              <p>React, Interia.js, and TypeScript out of the box.</p>
            </div>
            <div className="feature-card">
              <span className="icon">🎨</span>
              <h3>Beautiful</h3>
              <p>Includes modern CSS variables and dark mode support.</p>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '3rem' }}>
          <p className="tagline">This page was loaded via Inertia without a full page reload!</p>
        </div>
      </div>
    </Layout>
  )
}

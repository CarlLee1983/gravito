import Navigation from '../components/Navigation'
import ShopSection from '../components/ShopSection' // Reusing the component logic but wrapping it as a page

const Shop = () => {
  return (
    <main className="bg-paper-white min-h-screen selection:bg-fir-green selection:text-paper-white cursor-none">
      <Navigation />

      {/* Page Header */}
      <section className="h-[50vh] flex items-center justify-center relative overflow-hidden bg-ink-black text-paper-white">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40 grayscale"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1544787219-7f47ccb76574?q=80&w=2000&auto=format&fit=crop')",
          }}
        />
        <div className="relative z-10 text-center">
          <h1 className="text-6xl md:text-8xl font-display mb-4">韻味長廊</h1>
          <p className="font-sans tracking-[0.5em] opacity-60 uppercase text-sm">The Collection</p>
        </div>
      </section>

      {/* The Vertical Gallery */}
      <ShopSection />

      {/* Footer (Simplified for Shop) */}
      <footer className="bg-paper-white py-24 text-center">
        <p className="text-ink-black/20 text-sm font-display">雲霧南投</p>
      </footer>
    </main>
  )
}

export default Shop

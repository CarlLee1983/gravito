import { motion } from 'framer-motion'

const Visit = () => {
  return (
    <div className="min-h-screen bg-fir-green text-paper-white relative flex flex-col md:flex-row overflow-hidden">
      {/* Background Texture */}
      <div
        className="absolute inset-0 opacity-20 bg-cover bg-center grayscale mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1532274402911-5a369e4c4bb5?q=80&w=2000&auto=format&fit=crop')",
        }}
      />

      {/* Left: Info & Map */}
      <div className="w-full md:w-1/2 p-8 md:p-24 flex flex-col justify-between border-r border-white/10 relative z-10">
        <div>
          <h1 className="text-5xl md:text-7xl font-display mb-8">
            預約
            <br />
            品茗
          </h1>
          <p className="font-body text-white/60 leading-loose max-w-sm mb-12">
            南投縣魚池鄉日月潭
            <br />
            環湖公路 128 號<br />
            <br />
            每日 10:00 - 17:00
            <br />
            (採完全預約制)
          </p>
        </div>

        {/* Abstract Map */}
        <div className="aspect-square w-full bg-white/5 border border-white/10 rounded-full relative overflow-hidden group">
          <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-700 bg-[url('https://images.unsplash.com/photo-1532274402911-5a369e4c4bb5?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center" />

          <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-cinnabar rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_20px_rgba(166,52,41,0.5)] z-10" />
          <div className="absolute top-1/2 left-1/2 w-32 h-[1px] bg-white/20 -translate-x-1/2 -translate-y-1/2 rotate-45" />
          <div className="absolute top-1/2 left-1/2 w-[1px] h-32 bg-white/20 -translate-x-1/2 -translate-y-1/2" />
          <span className="absolute bottom-8 left-1/2 -translate-x-1/2 font-sans text-xs tracking-widest opacity-40">
            23.8°N, 120.9°E
          </span>
        </div>
      </div>

      {/* Right: Form */}
      <div className="w-full md:w-1/2 p-8 md:p-24 flex flex-col justify-center relative z-10 bg-fir-green/90 backdrop-blur-sm">
        <form className="flex flex-col gap-12 max-w-md w-full mx-auto">
          {/* Input Group */}
          {[
            { label: '姓名', type: 'text', placeholder: '您的稱呼' },
            { label: '人數', type: 'number', placeholder: '預約人數' },
            { label: '日期', type: 'date', placeholder: '' },
            { label: '聯絡電話', type: 'tel', placeholder: '09xx-xxx-xxx' },
          ].map((field) => (
            <div key={field.label} className="group relative">
              <label className="block font-display text-lg mb-2 text-white/80">
                {field.label}
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  className="w-full bg-transparent border-b border-white/20 py-4 text-xl font-body focus:outline-none focus:border-white transition-colors placeholder:text-white/20 text-white"
                />
              </label>
              {/* Ink underline effect */}
              <motion.div className="absolute bottom-0 left-0 h-[2px] bg-white w-0 group-focus-within:w-full transition-all duration-700 ease-out" />
            </div>
          ))}

          <button
            type="button"
            className="mt-8 py-4 px-8 border border-white/30 text-white font-sans tracking-[0.2em] hover:bg-white hover:text-fir-green transition-all duration-500 uppercase"
          >
            Send Request
          </button>
        </form>
      </div>
    </div>
  )
}

export default Visit

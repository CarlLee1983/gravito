import { Activity, LayoutGrid, Radio, Rocket, Shield, Terminal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTelemetry } from './hooks/useTelemetry'
import { cn } from './utils'

// React 19 Lucide compatibility wrapper
const Icon = ({ icon: Component, ...props }: any) => {
  return <Component {...props} />
}

/**
 * 工業級數據讀數組件
 */
const DataReadout = ({ label, value, unit, colorClass }: any) => (
  <div className="bg-black/40 border border-white/5 p-3 rounded shadow-inner group hover:border-sky-500/30 transition-colors">
    <div className="text-[9px] uppercase text-slate-500 font-bold mb-1 tracking-tighter">
      {label}
    </div>
    <div className="flex items-baseline gap-1">
      <span
        className={cn('text-xl font-black font-mono tracking-tighter transition-all', colorClass)}
      >
        {value}
      </span>
      <span className="text-[10px] text-slate-600 font-bold">{unit}</span>
    </div>
  </div>
)

function App() {
  const { logs, stats, connected } = useTelemetry()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const rockets = Array.from(new Set([...logs.map((l) => l.rocketId), ...Object.keys(stats)]))

  return (
    <div className="h-screen w-screen ground-control-bg relative flex flex-col overflow-hidden selection:bg-sky-500/30">
      <div className="scanline animate-scanline"></div>

      {/* 🟢 TOP STATUS BAR (HOUSTON HEADER) */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-black/60 backdrop-blur-sm z-20">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-500 flex items-center justify-center rounded-sm rotate-45 shadow-[0_0_15px_rgba(14,165,233,0.4)]">
              <Icon icon={Rocket} className="w-6 h-6 text-black -rotate-45" />
            </div>
            <div>
              <div className="text-sm font-black tracking-widest text-white leading-none">
                GRAVITO GROUND STATION
              </div>
              <div className="text-[9px] text-sky-500 font-mono mt-1 tracking-[0.3em]">
                HOUSTON / LAUNCH CONTROL
              </div>
            </div>
          </div>
          <div className="hidden md:flex gap-6 border-l border-white/10 pl-8">
            <div className="flex flex-col">
              <span className="text-[8px] text-slate-500 font-bold uppercase">Uplink Status</span>
              <span
                className={cn(
                  'text-[10px] font-mono font-bold',
                  connected ? 'text-emerald-400' : 'text-rose-500'
                )}
              >
                {connected ? '● SECURE CONNECTION' : '○ NO SIGNAL'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] text-slate-500 font-bold uppercase">System Time</span>
              <span className="text-[10px] font-mono text-slate-300 font-bold">
                {time.toISOString().replace('T', ' ').slice(0, 19)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 bg-slate-900/50 backdrop-blur-md border border-white/5 p-3 px-5 rounded-2xl">
          <div className="flex flex-col items-end">
            <span className="text-[8px] text-slate-500 uppercase font-bold tracking-tighter">
              Core Engine
            </span>
            <span
              className={cn('text-[10px] font-black', connected ? 'text-sky-400' : 'text-rose-500')}
            >
              {connected ? 'OPERATIONAL' : 'OFFLINE'}
            </span>
          </div>
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 border border-white/5',
              connected
                ? 'bg-sky-500/5 text-sky-400 shadow-[0_0_20px_rgba(14,165,233,0.1)]'
                : 'bg-rose-500/5 text-rose-500'
            )}
          >
            <Icon
              icon={Shield}
              className={cn('w-5 h-5', connected && 'animate-[spin_4s_linear_infinite]')}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* 🟡 LEFT SIDEBAR (RESOURCES) */}
        <aside className="w-64 border-r border-white/5 bg-black/40 p-6 flex flex-col gap-8 hidden lg:flex">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Icon icon={Activity} className="w-4 h-4 text-slate-500 animate-pulse" />
              <h2 className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                Telemetry Analysis
              </h2>
            </div>
            <div className="space-y-3">
              <DataReadout
                label="Uplink Stream"
                value={rockets.length}
                unit="ACTIVE"
                colorClass="text-sky-400"
              />
              <DataReadout label="Bandwidth" value="98.2" unit="%" colorClass="text-emerald-400" />
              <DataReadout label="Response" value="12" unit="MS" colorClass="text-amber-400" />
            </div>
          </section>

          <section className="flex-1">
            <div className="flex items-center gap-2 mb-4">
              <Icon icon={Radio} className="w-4 h-4 text-slate-500" />
              <h2 className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                Live Frequency
              </h2>
            </div>
            <div className="h-32 bg-sky-500/5 border border-sky-500/10 rounded-sm relative overflow-hidden group">
              <div className="absolute inset-0 flex items-center justify-around px-4 gap-1.5">
                {[...Array(16)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-sky-500/40 rounded-full transition-all duration-700 group-hover:bg-sky-400/60"
                    style={{
                      height: `${20 + Math.random() * 40}%`,
                      animation: `chaotic-signal ${1 + Math.random() * 2.5}s cubic-bezier(0.45, 0.05, 0.55, 0.95) ${i * 0.13}s infinite`,
                      boxShadow: '0 0 8px rgba(14, 165, 233, 0.05)',
                    }}
                  ></div>
                ))}
              </div>
            </div>
          </section>
        </aside>
        {/* 🔵 CENTER STAGE (MISSION GRID) */}
        <section className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {rockets.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20">
              <Icon icon={LayoutGrid} className="w-24 h-24 mb-6" />
              <div className="text-xl font-black tracking-[0.5em]">STANDING BY</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {rockets.map((rocketId) => {
                const rocketStats = stats[rocketId]
                const rocketLogs = logs.filter((l) => l.rocketId === rocketId).slice(-12)
                const lastLogTimestamp =
                  rocketLogs.length > 0 ? rocketLogs[rocketLogs.length - 1].timestamp : 0

                return (
                  <div
                    key={rocketId}
                    className="bg-[#0a0a0a] border-2 border-white/5 rounded shadow-2xl overflow-hidden flex flex-col transition-all duration-300"
                    style={{
                      animation: lastLogTimestamp ? 'data-pulse 0.5s ease-out' : 'none',
                    }}
                  >
                    {/* Module Header */}
                    <div className="p-4 bg-white/5 border-b border-white/5 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-sky-500 rounded-sm animate-pulse shadow-[0_0_8px_rgba(14,165,233,0.6)]"></div>
                        <span className="text-xs font-black font-mono tracking-widest text-white">
                          {rocketId}
                        </span>
                      </div>
                      <div className="flex gap-4">
                        <div className="text-right">
                          <div className="text-[8px] text-slate-500 font-bold uppercase leading-none">
                            Status
                          </div>
                          <div className="text-[10px] font-mono text-emerald-500 font-bold tracking-tighter">
                            ACTIVE_LINK
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row divide-x divide-white/5 h-full">
                      {/* Left: Quick Stats */}
                      <div className="p-5 flex flex-col gap-4 w-full md:w-48 bg-black/20">
                        <div className="space-y-1">
                          <div className="text-[8px] text-slate-500 uppercase font-bold">
                            Propulsion
                          </div>
                          <div className="text-lg font-mono font-black text-white">
                            {rocketStats?.cpu || '0.0%'}
                          </div>
                          <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-sky-500 transition-all duration-1000"
                              style={{ width: rocketStats?.cpu || '0%' }}
                            ></div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[8px] text-slate-500 uppercase font-bold">
                            Payload
                          </div>
                          <div className="text-[11px] font-mono font-bold text-slate-300">
                            {rocketStats?.memory.split('/')[0] || '0 MB'}
                          </div>
                        </div>
                        <div className="mt-auto pt-4 border-t border-white/5">
                          <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-bold tracking-widest">
                            <Icon icon={Shield} className="w-3 h-3 animate-pulse" />
                            NOMINAL
                          </div>
                        </div>
                      </div>

                      {/* Right: Terminal */}
                      <div className="flex-1 bg-black p-4 font-mono text-[10px] min-h-[200px] flex flex-col relative overflow-hidden group/term">
                        {/* CRT Scanline Effect */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 pointer-events-none bg-[length:100%_2px,3px_100%]"></div>

                        <div className="absolute top-2 right-2 text-white/5 uppercase font-black tracking-widest select-none z-20">
                          Log Stream
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar z-20 relative">
                          {rocketLogs.length === 0 && (
                            <div className="text-slate-800 animate-pulse">
                              {'\u003e\u003e\u003e'} ESTABLISHING DATALINK...
                            </div>
                          )}
                          {rocketLogs.map((log, i) => (
                            <div key={i} className="flex gap-2">
                              <span className="text-sky-500/40 select-none">
                                [{new Date(log.timestamp).toTimeString().slice(0, 8)}]
                              </span>
                              <span className="text-slate-400 leading-tight group-hover/term:text-slate-200 transition-colors">
                                {log.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>

      {/* 🔴 FOOTER CONSOLE (GLOBAL COMMAND LOG) */}
      <footer className="h-12 border-t border-white/10 bg-black flex items-center px-6 gap-8 z-20">
        <div className="flex items-center gap-2 text-sky-500 shrink-0">
          <Icon icon={Terminal} className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Global Terminal</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="text-[10px] font-mono text-slate-500 truncate animate-pulse">
            {logs.length > 0
              ? `\u003e Incoming data from ${logs[logs.length - 1].rocketId}: ${logs[logs.length - 1].text}`
              : '\u003e SYSTEM READY. STANDING BY FOR MISSION ASSIGNMENT...'}
          </div>
        </div>
        <div className="flex gap-4 text-[9px] font-bold uppercase tracking-tighter text-slate-600">
          <span>TX: ENABLED</span>
          <span>RX: SECURE</span>
          <span className="text-emerald-400 tracking-widest">RECYCLE: AUTO</span>
        </div>
      </footer>
    </div>
  )
}

export default App

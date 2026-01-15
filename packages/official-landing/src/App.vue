<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import BenchmarkArena from './components/BenchmarkArena.vue';
import AiHub from './components/AiHub.vue';
import Ecosystem from './components/Ecosystem.vue';
import QuickStart from './components/QuickStart.vue';

const mouseX = ref(0);
const mouseY = ref(0);

const handleGlobalMouseMove = (e: MouseEvent) => {
  // Map mouse position to range [-50, 50] for smooth parallax/warping
  mouseX.value = (e.clientX / window.innerWidth - 0.5) * 100;
  mouseY.value = (e.clientY / window.innerHeight - 0.5) * 100;
};

onMounted(() => {
  window.addEventListener('mousemove', handleGlobalMouseMove);
});

onUnmounted(() => {
  window.removeEventListener('mousemove', handleGlobalMouseMove);
});
</script>

<template>
  <div class="layout" :style="{ '--mx': `${mouseX}px`, '--my': `${mouseY}px` }">
    <!-- Background Grid -->
    <div class="space-grid" :style="{ perspectiveOrigin: `${50 + mouseX}% ${50 + mouseY}%` }">
      <div class="grid-warp"></div>
    </div>
    
    <!-- System Interference Overlay -->
    <div class="system-glitch">
      <div class="scanline"></div>
      <div class="interference"></div>
    </div>

    <div class="noise-overlay"></div>
    <div class="cosmic-haze">
      <div class="nebula-cloud nebula-1"></div>
      <div class="nebula-cloud nebula-2"></div>
      <div class="nebula-cloud nebula-3"></div>
    </div>
    <div class="ambient-light" :style="{ left: `${mouseX * 10 + 50}%`, top: `${mouseY * 10 + 50}%` }"></div>

    <!-- SVG Filters for high-end effects -->
    <svg style="position: absolute; width: 0; height: 0;" aria-hidden="true" focusable="false">
      <defs>
        <filter id="chromatic-glow">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feOffset in="blur" dx="2" dy="0" result="offset-r" />
          <feOffset in="blur" dx="-2" dy="0" result="offset-b" />
          <feComponentTransfer in="offset-r" result="red">
            <feFuncR type="linear" slope="1" intercept="0" />
            <feFuncG type="linear" slope="0" intercept="0" />
            <feFuncB type="linear" slope="0" intercept="0" />
          </feComponentTransfer>
          <feComponentTransfer in="offset-b" result="blue">
            <feFuncR type="linear" slope="0" intercept="0" />
            <feFuncG type="linear" slope="0" intercept="0" />
            <feFuncB type="linear" slope="1" intercept="0" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="red" />
            <feMergeNode in="blue" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>

    <!-- Hero Section -->
    <header class="hero">
      <nav class="nav glass-pane">
        <div class="logo">GRAVITO</div>
        <div class="links">
          <a href="#">Engine</a>
          <a href="#">Ecosystem</a>
          <a href="#">Benchmarks</a>
          <a href="#" class="btn-primary">Get Started</a>
        </div>
      </nav>

      <div class="hero-content">
        <div class="text-side">
          <span class="badge">Version 1.1.0 Optimized</span>
          <h1 class="text-gradient">The High-Performance Core for Bun.</h1>
          <p>
            Built for extreme speed. Designed for AI-driven development. 
            The gravitational foundation of your next-gen galaxy.
          </p>
          <div class="actions">
            <div class="copy-command">
              <span class="prefix">bun add</span> @gravito/core
              <button class="copy-btn">Copy</button>
            </div>
          </div>
        </div>

        <div class="visual-side">
          <!-- The New Hero Image Backdrop (Masked) -->
          <div class="hero-image-wrap">
            <img src="./assets/hero.png" alt="Gravito Core" class="hero-image">
            <div class="hero-mask"></div>
          </div>

          <div class="singularity-universe">
            <div class="singularity-container" :style="{ transform: `rotateX(65deg) rotateY(${mouseX * 0.1}deg)` }">
              <!-- The Core Focal Point - Singularity Paradox -->
              <div class="core-focal-point">
                <div class="core-lens"></div>
                <div class="core-nucleus">
                  <div class="nucleus-ring"></div>
                  <div class="nucleus-center"></div>
                </div>
                
                <!-- Dynamic Technical Callouts -->
                <div class="core-callout c1">
                  <div class="line"></div>
                  <div class="data">THRUST_VE_01 // 100K</div>
                </div>
                <div class="core-callout c2">
                  <div class="line"></div>
                  <div class="data">STABILITY // 0.998</div>
                </div>
                <div class="core-callout c3">
                  <div class="line"></div>
                  <div class="data">BUN_RUNTIME // OPTIMIZED</div>
                </div>

                <div class="core-lightning"></div>
                <div class="core-flare"></div>
              </div>
              
              <!-- Refined Elliptical Orbits -->
              <div class="orbit-bundle">
                <div class="orbit-track atlas-track">
                  <div class="planet-anchor atlas-anchor">
                    <div class="satellite-probe">
                      <div class="tether-line"></div>
                      <div class="probe-chassis">
                        <div class="solar-wings"></div>
                        <div class="probe-core">
                          <div class="ideogram-payload atlas-ideogram">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                              <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                              <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                          </div>
                        </div>
                        <div class="sensor-array"></div>
                      </div>
                      <div class="ideogram-glow atlas-glow"></div>
                    </div>
                  </div>
                </div>

                <div class="orbit-track zenith-track">
                  <div class="planet-anchor zenith-anchor">
                    <div class="satellite-probe">
                      <div class="tether-line"></div>
                      <div class="probe-chassis">
                        <div class="solar-wings"></div>
                        <div class="probe-core">
                          <div class="ideogram-payload zenith-ideogram">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 2L2 19H22L12 2Z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                              <path d="M12 2V19" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                              <path d="M2 19L12 11L22 19" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                          </div>
                        </div>
                        <div class="sensor-array"></div>
                      </div>
                      <div class="ideogram-glow zenith-glow"></div>
                    </div>
                  </div>
                </div>

                <div class="orbit-track stasis-track">
                  <div class="planet-anchor stasis-anchor">
                    <div class="satellite-probe">
                      <div class="tether-line"></div>
                      <div class="probe-chassis">
                        <div class="solar-wings"></div>
                        <div class="probe-core">
                          <div class="ideogram-payload stasis-ideogram">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.2"/>
                              <circle cx="12" cy="12" r="4" fill="currentColor"/>
                              <path d="M12 2V6M12 18V22M2 12H6M18 12H22" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                            </svg>
                          </div>
                        </div>
                        <div class="sensor-array"></div>
                      </div>
                      <div class="ideogram-glow stasis-glow"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Satellite Info Sidebar -->
          <div class="satellite-index glass-pane">
            <div class="index-item">
              <h4>◈ DATA PERSISTENCE</h4>
              <p>Atlas Engine System</p>
            </div>
            <div class="index-item">
              <h4>⌘ FULLSTACK CORE</h4>
              <p>Zenith Distribution Layer</p>
            </div>
            <div class="index-item">
              <h4>⏀ CACHING ARCH</h4>
              <p>Stasis Buffer Protocol</p>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Bento Section -->
    <section class="features">
      <div class="bento-grid">
        <!-- AI Card: The Grand Neural Window -->
        <div class="bento-card tall ai-card">
          <img src="./assets/ai_dx.png" alt="AI Neural Core" class="card-bg">
          <div class="card-overlay"></div>
          
          <div class="specimen-bracket top-left"></div>
          <div class="specimen-bracket bottom-right"></div>
          <div class="specimen-label">EX-01 / NEURAL ENGINE</div>

          <div class="card-content">
            <div class="card-visual">
              <div class="neural-window">
                <div class="node-grid"></div>
                <div class="scanning-ray"></div>
                <svg viewBox="0 0 100 100" class="neural-svg">
                  <circle cx="50" cy="50" r="10" class="core-node" />
                  <path d="M50 50 L20 20 M50 50 L80 20 M50 50 L20 80 M50 50 L80 80" class="neural-paths" />
                </svg>
              </div>
            </div>
            <div class="card-info">
              <span class="feat-tag">LLM READY</span>
              <h3>AI-First DX</h3>
              <p>Structured documentation and consistent patterns designed for LLM understanding.</p>
            </div>
            <div class="card-env-glow"></div>
          </div>
          <div class="card-border-beam"></div>
        </div>

        <!-- Performance Card: Raw Velocity Exhibit -->
        <div class="bento-card wide perf-card">
          <img src="./assets/performance.png" alt="Warp Drive" class="card-bg">
          <div class="card-overlay"></div>

          <div class="specimen-bracket top-left"></div>
          <div class="specimen-bracket bottom-right"></div>
          <div class="specimen-label">EX-02 / KINETIC CORE</div>

          <div class="card-content">
            <div class="card-visual">
              <div class="perf-telemetry">
                <div class="telemetry-grid"></div>
                <div class="perf-graph">
                  <div class="bar" style="height: 40%"><span class="val">42ms</span></div>
                  <div class="bar" style="height: 60%"><span class="val">28ms</span></div>
                  <div class="bar" style="height: 100%"><span class="val">12ms</span></div>
                  <div class="bar" style="height: 70%"><span class="val">18ms</span></div>
                </div>
                <div class="y-axis">
                  <span>100k</span>
                  <span>50k</span>
                  <span>0k</span>
                </div>
              </div>
            </div>
            <div class="card-info">
              <span class="feat-tag">100K+ RPS</span>
              <h3>+20% Faster</h3>
              <p>Optimized internal pathing and context pooling to crush benchmarks.</p>
            </div>
            <div class="card-env-glow"></div>
          </div>
          <div class="card-border-beam"></div>
        </div>

        <!-- Config Card: Technical Precision -->
        <div class="bento-card wide config-card">
          <img src="./assets/blueprint.png" alt="Technical Blueprint" class="card-bg">
          <div class="card-overlay"></div>

          <div class="specimen-bracket top-left"></div>
          <div class="specimen-bracket bottom-right"></div>
          <div class="specimen-label">EX-03 / ARCHITECTURE</div>

          <div class="card-content">
            <div class="card-visual">
              <div class="precision-watch">
                <div class="gear g1"></div>
                <div class="gear g2"></div>
                <div class="compass-ring"></div>
                <div class="tick-marks"></div>
              </div>
            </div>
            <div class="card-info">
              <span class="feat-tag">SCAFFOLD READY</span>
              <h3>Zero Config</h3>
              <p>Start your Bun-native server in seconds with type-safe APIs.</p>
            </div>
            <div class="card-env-glow"></div>
          </div>
          <div class="card-border-beam"></div>
        </div>
      </div>
    </section>

    <!-- Benchmark Arena -->
    <BenchmarkArena />

    <!-- Ecosystem Section -->
    <Ecosystem />

    <!-- AI Hub -->
    <AiHub />

    <!-- FAQ / QuickStart -->
    <QuickStart />

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-content">
        <p>© 2026 Gravito Ecosystem. Stability in Motion.</p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.layout {
  position: relative;
  min-height: 100vh;
  z-index: 1;
}

.space-grid {
  position: fixed;
  inset: 0;
  z-index: -1;
  perspective: 1000px;
  pointer-events: none;
  background: var(--bg-deep);
}

.grid-warp {
  position: absolute;
  inset: -100%;
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 80px 80px;
  transform: rotateX(20deg);
  mask-image: radial-gradient(circle at center, black 0%, transparent 80%);
  -webkit-mask-image: radial-gradient(circle at center, black 0%, transparent 80%);
}

/* Nav */
.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 2rem auto;
  padding: 0.75rem 2rem;
  width: 90%;
  max-width: 1200px;
}

.logo {
  font-weight: 800;
  font-size: 1.5rem;
  letter-spacing: 0.2em;
}

.links {
  display: flex;
  gap: 2rem;
  align-items: center;
}

.links a {
  color: var(--stellar-muted);
  text-decoration: none;
  font-weight: 500;
  font-size: 0.9rem;
  transition: var(--transition-smooth);
}

.links a:hover {
  color: var(--stellar-white);
}

.btn-primary {
  background: var(--core-glow);
  color: white !important;
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
}

/* Hero */
.hero {
  max-width: 1400px;
  margin: 0 auto;
  padding: 4rem 2rem;
}

.hero-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4rem;
  margin-top: 4rem;
}

.text-side {
  flex: 1;
}

.badge {
  display: inline-block;
  background: rgba(79, 70, 229, 0.1);
  color: var(--core-glow);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  border: 1px solid var(--gravity-ring);
}

h1 {
  font-size: 6rem;
  line-height: 0.9;
  margin-bottom: 2rem;
  mix-blend-mode: difference;
  letter-spacing: -0.06em;
  position: relative;
  text-shadow: 
    calc(var(--mx) * -0.1px) 0 #ff0000,
    calc(var(--mx) * 0.1px) 0 #00ffff;
  transition: text-shadow 0.1s ease;
}

/* System Glitch Overlay */
.system-glitch {
  position: fixed;
  inset: 0;
  z-index: 1000;
  pointer-events: none;
  overflow: hidden;
  opacity: 0.05;
}

.scanline {
  width: 100%;
  height: 10px;
  background: linear-gradient(to bottom, transparent, var(--core-glow), transparent);
  position: absolute;
  top: -100px;
  animation: scan-vertical 8s linear infinite;
}

@keyframes scan-vertical {
  0% { top: -100px; }
  100% { top: 110%; }
}

.interference {
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, transparent 1px, transparent 2px);
  background-size: 100% 3px;
}


p {
  font-size: 1.25rem;
  color: var(--stellar-muted);
  max-width: 500px;
  margin-bottom: 3rem;
}

/* Copy Command */
.copy-command {
  background: #111827;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  font-family: var(--font-mono);
  display: inline-flex;
  align-items: center;
  gap: 1rem;
  border: 1px solid var(--border-light);
}

.prefix {
  color: #6366f1;
}

.copy-btn {
  background: rgba(255, 255, 255, 0.05);
  border: none;
  color: var(--stellar-muted);
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
}

/* Visual Side - Premium Overhaul */
.visual-side {
  flex: 1.4;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 800px;
  perspective: 2000px;
}

.hero-image-wrap {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 0;
  opacity: 0.4;
  filter: saturate(0.5) contrast(1.2);
}

.hero-image {
  width: 900px;
  height: 900px;
  mask-image: radial-gradient(circle, black 30%, transparent 65%);
  -webkit-mask-image: radial-gradient(circle, black 30%, transparent 65%);
}

.singularity-universe {
  position: relative;
  z-index: 10;
  width: 600px;
  height: 600px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.singularity-container {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  display: flex;
  justify-content: center;
  align-items: center;
}

.core-focal-point {
  position: absolute;
  width: 200px;
  height: 200px;
  transform: rotateX(-65deg);
  display: flex;
  justify-content: center;
  align-items: center;
}

.core-lens {
  position: absolute;
  inset: -100px;
  background: radial-gradient(circle, rgba(var(--core-glow-rgb), 0.1) 0%, transparent 70%);
  backdrop-filter: blur(4px) saturate(2);
  mask-image: radial-gradient(circle, black 0%, transparent 70%);
  -webkit-mask-image: radial-gradient(circle, black 0%, transparent 70%);
  z-index: 1;
  pointer-events: none;
}

.core-callout {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 15px;
  pointer-events: none;
  z-index: 20;
}

.core-callout .line {
  height: 1px;
  background: linear-gradient(90deg, var(--core-glow), transparent);
  width: 0;
  transition: width 1s cubic-bezier(0.16, 1, 0.3, 1);
}

.core-callout .data {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  color: var(--core-glow);
  opacity: 0;
  white-space: nowrap;
  letter-spacing: 0.1em;
  transition: opacity 1s ease;
}

.core-callout.c1 { transform: rotate(-45deg) translate(140px); }
.core-callout.c2 { transform: rotate(135deg) translate(140px); }
.core-callout.c3 { transform: rotate(225deg) translate(140px); }

.singularity-container:hover .core-callout .line { width: 100px; }
.singularity-container:hover .core-callout .data { opacity: 0.8; }

.core-nucleus {
  position: absolute;
  width: 60px;
  height: 60px;
  background: #fff;
  border-radius: 50%;
  filter: url(#chromatic-glow);
  box-shadow: 0 0 40px var(--core-glow);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 5;
}

.nucleus-ring {
  position: absolute;
  width: 120%;
  height: 120%;
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  animation: spin-nucleus 3s linear infinite;
}

.nucleus-center {
  width: 20px;
  height: 20px;
  background: var(--bg-deep);
  border-radius: 50%;
  box-shadow: inset 0 0 10px var(--core-glow);
}

.core-flare {
  position: absolute;
  width: 300px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #fff, transparent);
  transform: rotate(45deg);
  opacity: 0.3;
  filter: blur(2px);
  animation: flare-sweep 5s ease-in-out infinite;
}

@keyframes spin-nucleus {
  from { transform: rotate(0deg) scale(0.9); }
  50% { transform: rotate(180deg) scale(1.1); }
  to { transform: rotate(360deg) scale(0.9); }
}

@keyframes flare-sweep {
  0% { transform: rotate(45deg) translateX(-100%); opacity: 0; }
  50% { opacity: 0.5; }
  100% { transform: rotate(45deg) translateX(100%); opacity: 0; }
}

@keyframes aura-expand {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.3); opacity: 0.8; }
}

/* Orbit Bundle */
.orbit-bundle {
  position: absolute;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
}

.orbit-track {
  position: absolute;
  top: 50%;
  left: 50%;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 50%;
  transform-style: preserve-3d;
}

.atlas-track { width: 350px; height: 350px; margin-top: -175px; margin-left: -175px; animation: orbit-rotation 20s linear infinite; }
.zenith-track { width: 550px; height: 550px; margin-top: -275px; margin-left: -275px; animation: orbit-rotation 35s linear infinite reverse; }
.stasis-track { width: 750px; height: 750px; margin-top: -375px; margin-left: -375px; animation: orbit-rotation 50s linear infinite; }

.planet-anchor {
  position: absolute;
  top: 50%;
  left: 0;
  transform-style: preserve-3d;
}

.satellite-probe {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  transform-style: preserve-3d;
  animation: probe-float 6s ease-in-out infinite;
}

.tether-line {
  position: absolute;
  right: 100%;
  width: 150px;
  height: 1px;
  background: linear-gradient(to left, rgba(255,255,255,0.2), transparent);
  transform: translateY(-50%);
  opacity: 0.2;
}

.probe-chassis {
  position: relative;
  width: 50px;
  height: 30px;
  transform: rotateX(-65deg);
  transform-style: preserve-3d;
  display: flex;
  align-items: center;
  justify-content: center;
}

.probe-core {
  width: 24px;
  height: 24px;
  background: #111827;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  box-shadow: 0 0 15px rgba(0,0,0,0.5);
}

.solar-wings {
  position: absolute;
  width: 80px;
  height: 12px;
  background: linear-gradient(90deg, 
    rgba(255,255,255,0.05) 0%, 
    rgba(255,255,255,0.15) 50%, 
    rgba(255,255,255,0.05) 100%);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 1px;
  z-index: 1;
}

.solar-wings::after {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  width: 1px;
  height: 100%;
  background: rgba(255,255,255,0.2);
}

.sensor-array {
  position: absolute;
  top: -8px;
  width: 2px;
  height: 8px;
  background: var(--ideogram-color);
  box-shadow: 0 0 10px var(--ideogram-color);
}

.ideogram-payload {
  width: 16px;
  height: 16px;
  color: var(--ideogram-color);
  opacity: 0.9;
  filter: drop-shadow(0 0 5px var(--ideogram-color));
}

.ideogram-glow {
  position: absolute;
  width: 100px;
  height: 100px;
  background: radial-gradient(circle, var(--ideogram-color) 0%, transparent 70%);
  opacity: 0.15;
  filter: blur(15px);
  z-index: -1;
}

/* Enhanced Orbit Physics */
.atlas-track { width: 420px; height: 420px; margin-top: -210px; margin-left: -210px; animation: orbit-rotation 28s linear infinite; }
.zenith-track { width: 640px; height: 640px; margin-top: -320px; margin-left: -320px; animation: orbit-rotation 45s linear infinite reverse; }
.stasis-track { width: 880px; height: 880px; margin-top: -440px; margin-left: -440px; animation: orbit-rotation 60s linear infinite; }

/* Satellite Index Sidebar */
.satellite-index {
  position: absolute;
  right: -3rem;
  bottom: -2rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  z-index: 100;
  border-radius: 4px;
  background: rgba(10, 12, 16, 0.4);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.05);
}

/* Ideogram Variants */
.atlas-ideogram { --ideogram-color: #10b981; }
.zenith-ideogram { --ideogram-color: #f59e0b; }
.stasis-ideogram { --ideogram-color: #06b6d4; }
.atlas-glow { --ideogram-color: #10b981; }
.zenith-glow { --ideogram-color: #f59e0b; }
.stasis-glow { --ideogram-color: #06b6d4; }

@keyframes probe-float {
  0%, 100% { transform: translateY(-8px) rotateZ(-1deg); }
  50% { transform: translateY(8px) rotateZ(1deg); }
}

@keyframes orbit-rotation {
  from { transform: rotateZ(0deg); }
  to { transform: rotateZ(360deg); }
}

/* Bento Grid Cinematic Overhaul */
.features {
  max-width: 1300px;
  margin: 0 auto 12rem;
  padding: 0 2rem;
}

.bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 320px);
  gap: 2.5rem;
}

/* Theme Colors */
.ai-card { --feat-color-rgb: 99, 102, 241; }
.perf-card { --feat-color-rgb: 16, 185, 129; }
.config-card { --feat-color-rgb: 245, 158, 11; }

.bento-card {
  position: relative;
  background: rgba(5, 7, 10, 0.4);
  backdrop-filter: blur(20px);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid rgba(255, 255, 255, 0.03);
}

.bento-card.tall { grid-row: span 2; flex-direction: column; }
.bento-card.wide { grid-column: span 2; flex-direction: row; }

.card-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.15;
  filter: grayscale(1) brightness(0.5) contrast(1.2);
  transition: all 1.2s cubic-bezier(0.16, 1, 0.3, 1);
  mix-blend-mode: luminosity;
}

.bento-card:hover .card-bg {
  transform: scale(1.05);
  opacity: 0.3;
  filter: grayscale(0.5) brightness(0.7) contrast(1.2);
}

.card-env-glow {
  position: absolute;
  inset: -50px;
  background: radial-gradient(circle at center, rgba(var(--feat-color-rgb), 0.15) 0%, transparent 60%);
  opacity: 0;
  z-index: -1;
  filter: blur(40px);
  transition: all 0.8s ease;
}

.bento-card:hover .card-env-glow {
  opacity: 1;
}

.specimen-bracket {
  position: absolute;
  width: 20px;
  height: 20px;
  border: 1px solid rgba(var(--feat-color-rgb), 0.3);
  z-index: 5;
  pointer-events: none;
}

.top-left { top: 1.5rem; left: 1.5rem; border-right: none; border-bottom: none; }
.bottom-right { bottom: 1.5rem; right: 1.5rem; border-left: none; border-top: none; }

.specimen-label {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  font-family: var(--font-mono);
  font-size: 0.6rem;
  color: rgba(var(--feat-color-rgb), 0.5);
  letter-spacing: 0.1rem;
  z-index: 5;
}

/* Sophisticated Gradient Veil */
.card-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(to bottom, 
    rgba(0,0,0,0.1) 0%,
    rgba(0, 0, 0, 0.4) 40%,
    rgba(0, 0, 0, 0.9) 85%,
    #000 100%);
}

.bento-card.wide .card-overlay {
  background: linear-gradient(to right, 
    rgba(0,0,0,0.1) 0%,
    rgba(0, 0, 0, 0.4) 30%,
    rgba(0, 0, 0, 0.9) 75%,
    #000 100%);
}

.card-content {
  position: relative;
  z-index: 2;
  flex: 1;
  display: flex;
  padding: 3rem;
  gap: 2rem;
}

.bento-card.tall .card-content {
  flex-direction: column;
  justify-content: flex-end;
}

.bento-card.wide .card-content {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.card-visual {
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
}

.bento-card.wide .card-visual {
  width: 320px;
}

.card-info {
  flex: 1;
}

.feat-tag {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: rgba(var(--feat-color-rgb), 1);
  letter-spacing: 0.3em;
  padding: 4px 12px;
  background: rgba(var(--feat-color-rgb), 0.08);
  border: 1px solid rgba(var(--feat-color-rgb), 0.2);
  border-radius: 2px;
  display: inline-flex;
  margin-bottom: 1.5rem;
  position: relative;
  overflow: hidden;
}

.feat-tag::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(var(--feat-color-rgb), 0.2), transparent);
  animation: scan 3s infinite;
}

@keyframes scan {
  0% { left: -100%; }
  100% { left: 100%; }
}

.bento-card h3 {
  font-size: 2.5rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: 1.2rem;
  letter-spacing: -0.02em;
  line-height: 1;
}

.bento-card p {
  font-size: 1.1rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.5);
  max-width: 440px;
  margin: 0;
}

/* AI Neural Window */
.neural-window {
  position: relative;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle at center, rgba(var(--feat-color-rgb), 0.1) 0%, transparent 70%);
  border: 1px solid rgba(var(--feat-color-rgb), 0.2);
  border-radius: 8px;
  overflow: hidden;
}

.node-grid {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(var(--feat-color-rgb), 0.3) 1px, transparent 1px);
  background-size: 20px 20px;
  opacity: 0.3;
}

.scanning-ray {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--core-glow);
  box-shadow: 0 0 15px var(--core-glow);
  animation: ray-slide 4s linear infinite;
}

@keyframes ray-slide {
  0% { top: 0; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { top: 100%; opacity: 0; }
}

.neural-svg {
  width: 100%;
  height: 100%;
  padding: 40px;
}

.core-node {
  fill: rgba(var(--feat-color-rgb), 0.4);
  stroke: rgba(var(--feat-color-rgb), 1);
  animation: pulse 2s ease-in-out infinite;
}

.neural-paths {
  stroke: rgba(var(--feat-color-rgb), 0.3);
  stroke-width: 0.5;
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
  animation: draw 4s linear infinite;
}

@keyframes draw {
  to { stroke-dashoffset: 0; }
}

/* Perf Telemetry */
.perf-telemetry {
  position: relative;
  width: 280px;
  height: 160px;
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(var(--feat-color-rgb), 0.15);
  padding: 20px;
  display: flex;
  gap: 20px;
}

.telemetry-grid {
  position: absolute;
  inset: 0;
  border-bottom: 1px solid rgba(var(--feat-color-rgb), 0.1);
  background-image: linear-gradient(rgba(var(--feat-color-rgb), 0.05) 1px, transparent 1px);
  background-size: 100% 20px;
}

.perf-graph {
  flex: 1;
  display: flex;
  align-items: flex-end;
  gap: 15px;
  z-index: 2;
}

.perf-graph .bar {
  flex: 1;
  background: linear-gradient(to top, rgba(var(--feat-color-rgb), 0.2), rgba(var(--feat-color-rgb), 1));
  border-radius: 1px;
  position: relative;
  transition: all 0.3s ease;
}

.bar .val {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-family: var(--font-mono);
  font-size: 0.5rem;
  color: rgba(var(--feat-color-rgb), 0.8);
  opacity: 0;
}

.bento-card:hover .bar .val { opacity: 1; }

.y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-family: var(--font-mono);
  font-size: 0.5rem;
  color: rgba(var(--feat-color-rgb), 0.4);
  text-align: right;
  width: 30px;
}

/* Precision Watch */
.precision-watch {
  position: relative;
  width: 180px;
  height: 180px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.compass-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 1px solid rgba(var(--feat-color-rgb), 0.2);
  border-radius: 50%;
}

.compass-ring::after {
  content: 'N';
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.6rem;
  color: rgba(var(--feat-color-rgb), 1);
}

.tick-marks {
  position: absolute;
  inset: 10px;
  border: 1px dashed rgba(var(--feat-color-rgb), 0.1);
  border-radius: 50%;
  animation: orbit-rotation 20s linear infinite;
}

.gear {
  position: absolute;
  border: 2px solid rgba(var(--feat-color-rgb), 0.4);
  border-radius: 4px;
}

.g1 { width: 60px; height: 60px; animation: orbit-rotation 10s linear infinite; }
.g2 { width: 40px; height: 40px; border-color: rgba(var(--feat-color-rgb), 0.2); animation: orbit-rotation 6s linear infinite reverse; }

/* Border Beam Effect */
.card-border-beam {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: 12px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0);
  transition: all 0.5s ease;
  overflow: hidden;
}

.card-border-beam::after {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: conic-gradient(
    transparent, 
    rgba(var(--feat-color-rgb), 0.3), 
    transparent 30%
  );
  animation: beam-rotate 4s linear infinite;
  opacity: 0;
  transition: opacity 0.5s ease;
}

.bento-card:hover .card-border-beam::after {
  opacity: 1;
}

@keyframes beam-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.bento-card:hover .card-border-beam {
  box-shadow: inset 0 0 0 1px rgba(var(--feat-color-rgb), 0.4), 0 0 20px rgba(var(--feat-color-rgb), 0.1);
}

.bento-card:hover {
  border-color: rgba(var(--feat-color-rgb), 0.2);
  transform: translateY(-5px);
}

/* Footer Colors Correction */
.footer {
  padding: 4rem 2rem;
  border-top: 1px solid rgba(255,255,255,0.05);
  text-align: center;
  color: var(--stellar-muted);
}

.magic-circles .c1 { animation: slow-rotate 12s linear infinite; border-style: dashed; }
.magic-circles .c2 { transform: scale(0.65); animation: slow-rotate 18s linear reverse infinite; }

/* Colors */
.ai-card { --feat-color-rgb: 99, 102, 241; }
.perf-card { --feat-color-rgb: 16, 185, 129; }
.config-card { --feat-color-rgb: 245, 158, 11; }

@keyframes slow-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.magic-circles {
  position: relative;
  width: 80px;
  height: 80px;
}

.magic-circles .circle {
  position: absolute;
  border: 1px solid rgba(var(--feat-color-rgb), 0.3);
  border-radius: 50%;
  width: 100%;
  height: 100%;
}

.magic-circles .c1 { animation: slow-rotate 10s linear infinite; border-style: dashed; }
.magic-circles .c2 { transform: scale(0.6); animation: slow-rotate 15s linear reverse infinite; }

/* Colors */
.ai-card { --feat-color-rgb: 99, 102, 241; }
.perf-card { --feat-color-rgb: 16, 185, 129; }
.config-card { --feat-color-rgb: 245, 158, 11; }

@keyframes slow-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Footer */
.footer {
  padding: 4rem 2rem;
  border-top: 1px solid var(--border-light);
  text-align: center;
}

.footer p {
  font-size: 0.9rem;
  margin: 0 auto;
}
</style>

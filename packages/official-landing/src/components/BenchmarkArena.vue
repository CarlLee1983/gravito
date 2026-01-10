<script setup lang="ts">
import { ref } from 'vue';

const benchmarks = [
  { name: 'Gravito Core', rps: 101240, color: '#10b981', current: true },
  { name: 'Bun Native', rps: 98450, color: '#ffffff', current: false },
  { name: 'Hono (Bun)', rps: 82140, color: '#e11d48', current: false },
  { name: 'Elysia', rps: 79500, color: '#06b6d4', current: false },
];

const maxRps = Math.max(...benchmarks.map(b => b.rps));
</script>

<template>
  <section class="benchmark-arena">
    <div class="arena-bg">
      <img src="../assets/performance.png" alt="" class="bg-image">
      <div class="bg-mask"></div>
    </div>

    <div class="container">
      <div class="header">
        <span class="sect-tag">REAL-TIME TELEMETRY</span>
        <h2 class="text-gradient">Benchmark Arena</h2>
        <p>Raw performance metrics on Bun runtime. Measuring maximum stable throughput on a single core.</p>
      </div>

      <div class="chart-container glass-pane">
        <div class="chart-header">
          <div class="specimen-id">TELEM-992</div>
          <div class="status-indicator">● LIVE_FEED</div>
        </div>

        <div class="chart-content">
          <div v-for="b in benchmarks" :key="b.name" class="bar-row">
            <div class="label">
              <span class="name">{{ b.name }}</span>
              <span class="metadata">{{ b.current ? '[ OPTIMIZED ]' : '[ RAW_BUN ]' }}</span>
            </div>
            <div class="track-wrap">
              <div class="track">
                <div 
                  class="fill" 
                  :style="{ 
                    width: `${(b.rps / maxRps) * 100}%`, 
                    backgroundColor: b.color,
                    boxShadow: b.current ? `0 0 30px ${b.color}44` : 'none'
                  }"
                >
                  <div v-if="b.current" class="glow-edge"></div>
                </div>
              </div>
              <div class="value">{{ b.rps.toLocaleString() }} <small>RPS</small></div>
            </div>
          </div>
        </div>

        <div class="chart-footer">
          <div class="metric">LATENCY: 0.12ms</div>
          <div class="metric">STABILITY: 100%</div>
          <div class="metric">THROUGHPUT: PEAK</div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.benchmark-arena {
  position: relative;
  padding: 12rem 2rem;
  overflow: hidden;
}

.arena-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  opacity: 0.1;
  pointer-events: none;
}

.bg-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: grayscale(1) brightness(0.5);
}

.bg-mask {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, transparent 0%, #05070a 80%);
}

.container {
  position: relative;
  z-index: 1;
  max-width: 1100px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 6rem;
}

.sect-tag {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.4em;
  color: var(--core-glow);
  display: block;
  margin-bottom: 1rem;
}

.header h2 {
  font-size: 4rem;
  margin-bottom: 1.5rem;
  letter-spacing: -0.04em;
}

.header p {
  font-size: 1.25rem;
  color: var(--stellar-muted);
  max-width: 600px;
  margin: 0 auto;
}

.chart-container {
  padding: 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.05);
}

.chart-header {
  background: rgba(255,255,255,0.03);
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.specimen-id {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: rgba(255,255,255,0.4);
}

.status-indicator {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: #10b981;
  animation: pulse 2s infinite;
}

.chart-content {
  padding: 4rem;
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.bar-row {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.label {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.name {
  font-weight: 800;
  font-size: 1.25rem;
  letter-spacing: -0.02em;
}

.metadata {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  color: rgba(255,255,255,0.3);
}

.track-wrap {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.track {
  flex: 1;
  height: 6px;
  background: rgba(255,255,255,0.03);
  border-radius: 3px;
  position: relative;
  overflow: hidden;
}

.fill {
  height: 100%;
  border-radius: 3px;
  transition: width 2s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
}

.glow-edge {
  position: absolute;
  top: 0;
  right: 0;
  width: 40px;
  height: 100%;
  background: linear-gradient(to right, transparent, rgba(255,255,255,0.8));
  filter: blur(4px);
  animation: speed-scan 3s infinite;
}

@keyframes speed-scan {
  0% { transform: translateX(-100%); opacity: 0; }
  20% { opacity: 0.8; }
  80% { opacity: 0.8; }
  100% { transform: translateX(100%); opacity: 0; }
}

.value {
  font-family: var(--font-mono);
  font-size: 1.25rem;
  font-weight: 700;
  width: 140px;
  text-align: right;
}

.value small {
  font-size: 0.6rem;
  opacity: 0.4;
  margin-left: 4px;
}

.chart-footer {
  background: rgba(255,255,255,0.02);
  padding: 1.5rem 4rem;
  display: flex;
  gap: 4rem;
  border-top: 1px solid rgba(255,255,255,0.05);
}

.metric {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  color: rgba(255,255,255,0.4);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>


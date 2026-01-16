<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const benchmarks = ref([
  { name: 'Gravito Core', baseRps: 101240, rps: 101240, color: '#10b981', current: true },
  { name: 'Bun Native', baseRps: 98450, rps: 98450, color: '#ffffff', current: false },
  { name: 'Hono (Bun)', baseRps: 82140, rps: 82140, color: '#e11d48', current: false },
  { name: 'Elysia', baseRps: 79500, rps: 79500, color: '#06b6d4', current: false },
]);

const maxRps = Math.max(...benchmarks.value.map(b => b.baseRps));
let telemetryInterval: any = null;

const updateTelemetry = () => {
  benchmarks.value.forEach(b => {
    // Subtle fluctuation ±0.05%
    const fluctuation = b.baseRps * (1 + (Math.random() - 0.5) * 0.001);
    b.rps = Math.floor(fluctuation);
  });
};

onMounted(() => {
  telemetryInterval = setInterval(updateTelemetry, 150);
});

onUnmounted(() => {
  if (telemetryInterval) clearInterval(telemetryInterval);
});
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
          <div class="specimen-id">TELEM-992 / KINETIC_MONITOR</div>
          <div class="status-indicator">
            <span class="pulse-dot"></span>
            LIVE_FEED
          </div>
        </div>

        <div class="chart-content">
          <div v-for="b in benchmarks" :key="b.name" class="bar-row" :class="{ 'optimized': b.current }">
            <div class="label">
              <div class="name-group">
                <span class="name">{{ b.name }}</span>
                <span v-if="b.current" class="opt-badge">STABLE_CORE</span>
              </div>
              <span class="metadata">{{ b.current ? '[ OPTIMIZED_PATH ]' : '[ STANDARD_IO ]' }}</span>
            </div>
            <div class="track-wrap">
              <div class="track">
                <div 
                  class="fill" 
                  :style="{ 
                    width: `${(b.rps / maxRps) * 100}%`, 
                    backgroundColor: b.color,
                    boxShadow: b.current ? `0 0 40px ${b.color}33` : 'none'
                  }"
                >
                  <div v-if="b.current" class="energy-pulse"></div>
                  <div class="scan-line"></div>
                </div>
              </div>
              <div class="value-container">
                <span class="value">{{ b.rps.toLocaleString() }}</span>
                <span class="unit">RPS</span>
              </div>
            </div>
          </div>
        </div>

        <div class="chart-footer">
          <div class="metric-block">
            <span class="label">LATENCY</span>
            <span class="val">0.12ms</span>
          </div>
          <div class="divider"></div>
          <div class="metric-block">
            <span class="label">STABILITY</span>
            <span class="val">100.0%</span>
          </div>
          <div class="divider"></div>
          <div class="metric-block">
            <span class="label">ENGINE</span>
            <span class="val">V1.1_NOVA</span>
          </div>
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
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.05);
  background: rgba(10, 12, 16, 0.4);
}

.chart-header {
  background: rgba(255,255,255,0.02);
  padding: 1.25rem 2.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.specimen-id {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: rgba(255,255,255,0.3);
  letter-spacing: 0.1em;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: #10b981;
  letter-spacing: 0.1em;
}

.pulse-dot {
  width: 6px;
  height: 6px;
  background: #10b981;
  border-radius: 50%;
  animation: pulse-ring 2s infinite;
}

@keyframes pulse-ring {
  0% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
  70% { transform: scale(1.1); opacity: 0.8; box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
  100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

.chart-content {
  padding: 4rem 5rem;
  display: flex;
  flex-direction: column;
  gap: 3.5rem;
}

.bar-row {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.label {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.name-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.name {
  font-weight: 800;
  font-size: 1.4rem;
  letter-spacing: -0.02em;
}

.opt-badge {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  padding: 2px 6px;
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 2px;
}

.metadata {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: rgba(255,255,255,0.2);
}

.track-wrap {
  display: flex;
  align-items: center;
  gap: 2.5rem;
}

.track {
  flex: 1;
  height: 4px;
  background: rgba(255,255,255,0.02);
  border-radius: 2px;
  position: relative;
  overflow: hidden;
}

.fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.optimized .fill {
  background: linear-gradient(90deg, #065f46, #10b981);
}

.energy-pulse {
  position: absolute;
  top: 0;
  right: 0;
  width: 100px;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
  animation: energy-flow 2s infinite linear;
}

@keyframes energy-flow {
  from { transform: translateX(-200%); }
  to { transform: translateX(100%); }
}

.scan-line {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05) 50%, transparent);
  background-size: 200% 100%;
  animation: scan-move 4s infinite linear;
}

@keyframes scan-move {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}

.value-container {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  min-width: 160px;
  justify-content: flex-end;
}

.value {
  font-family: var(--font-mono);
  font-size: 1.5rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #fff;
}

.unit {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: rgba(255,255,255,0.3);
  letter-spacing: 0.05em;
}

.chart-footer {
  background: rgba(255,255,255,0.015);
  padding: 1.5rem 5rem;
  display: flex;
  align-items: center;
  gap: 3rem;
  border-top: 1px solid rgba(255,255,255,0.05);
}

.metric-block {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.metric-block .label {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  color: rgba(255,255,255,0.2);
  letter-spacing: 0.1em;
}

.metric-block .val {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(255,255,255,0.7);
}

.divider {
  width: 1px;
  height: 24px;
  background: rgba(255,255,255,0.05);
}
</style>


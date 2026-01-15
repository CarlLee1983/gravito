<script setup lang="ts">
const modules = [
  {
    id: 'ATLAS',
    name: 'Atlas Engine',
    desc: 'The gravitational bedrock for data. A high-performance, type-safe ORM supporting PostgreSQL, MySQL, SQLite, and MongoDB.',
    tag: 'PERSISTENCE',
    color: '#10b981',
    features: ['Schema Inference', 'Automated Migrations', 'AOT Query Builder']
  },
  {
    id: 'ZENITH',
    name: 'Zenith Console',
    desc: 'The mission control for your galaxy. A zero-config control plane to monitor, manage, and scale distributed Gravito nodes.',
    tag: 'CONTROL_PLANE',
    color: '#f59e0b',
    features: ['Real-time Monitoring', 'Queue Management', 'Visual Telemetry']
  },
  {
    id: 'STASIS',
    name: 'Stasis Buffer',
    desc: 'Time-bending caching layer. Distributed memory management with sub-millisecond retrieval.',
    tag: 'CACHING',
    color: '#06b6d4',
    features: ['Redis Native', 'Memory Pooling', 'Adaptive Expiry']
  },
  {
    id: 'FLARE',
    name: 'Flare Telemetry',
    desc: 'Operational light. Advanced logging, error tracking, and real-time observability for your galaxy.',
    tag: 'OBSERVABILITY',
    color: '#e11d48',
    features: ['Glitch Detection', 'Panic Recovery', 'Structured JSON Logs']
  }
];
</script>

<template>
  <section class="ecosystem">
    <div class="container">
      <div class="header">
        <span class="sect-tag">MODULAR_PROTOCOL</span>
        <h2 class="text-gradient">The Gravito Ecosystem</h2>
        <p>Pick the modules you need. Each one is a standalone star, together they form a powerful galaxy.</p>
      </div>

      <div class="module-grid">
        <div v-for="m in modules" :key="m.id" class="module-card glass-pane" :style="{ '--m-color': m.color }">
          <div class="card-header">
            <span class="m-tag">{{ m.tag }}</span>
            <span class="m-id">{{ m.id }}-PROC</span>
          </div>
          
          <div class="card-body">
            <div class="title-wrap">
              <h3>{{ m.name }}</h3>
              <div class="status-chip">OPERATIONAL</div>
            </div>
            <p>{{ m.desc }}</p>
            
            <div class="specs-grid">
              <div v-for="f in m.features" :key="f" class="spec-item">
                <div class="spec-dot"></div>
                <span class="spec-text">{{ f }}</span>
              </div>
            </div>
          </div>

          <div class="card-footer">
            <button class="btn-action">
              <span class="btn-text">INITIALIZE_CORE</span>
              <span class="btn-icon">→</span>
            </button>
          </div>

          <!-- Decorative elements for tech feel -->
          <div class="corner-accents">
            <div class="accent tl"></div>
            <div class="accent br"></div>
          </div>
          <div class="bg-glow"></div>
          <div class="scanline-overlay"></div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ecosystem {
  padding: 12rem 2rem;
  position: relative;
}

.container {
  max-width: 1300px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 8rem;
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
  max-width: 700px;
  margin: 0 auto;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 3rem;
}

.module-card {
  position: relative;
  padding: 4rem;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  border-radius: 4px;
  background: rgba(10, 12, 16, 0.4);
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid rgba(255, 255, 255, 0.03);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3rem;
}

.m-tag {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.2em;
  color: var(--m-color);
  background: rgba(var(--m-color), 0.05);
  padding: 4px 10px;
  border: 1px solid rgba(var(--m-color), 0.2);
}

.m-id {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  color: rgba(255,255,255,0.15);
  letter-spacing: 0.1em;
}

.card-body {
  flex: 1;
}

.title-wrap {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.card-body h3 {
  font-size: 2rem;
  letter-spacing: -0.02em;
  color: #fff;
}

.status-chip {
  font-family: var(--font-mono);
  font-size: 0.5rem;
  color: #10b981;
  opacity: 0.6;
}

.card-body p {
  color: rgba(255,255,255,0.4);
  margin-bottom: 3rem;
  font-size: 1.05rem;
  line-height: 1.7;
}

.specs-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.spec-item {
  display: flex;
  align-items: center;
  gap: 12px;
  opacity: 0.7;
  transition: all 0.3s ease;
}

.module-card:hover .spec-item {
  opacity: 1;
  transform: translateX(5px);
}

.spec-dot {
  width: 4px;
  height: 4px;
  background: var(--m-color);
  border-radius: 50%;
  box-shadow: 0 0 10px var(--m-color);
}

.spec-text {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: rgba(255,255,255,0.6);
}

.card-footer {
  margin-top: 4rem;
}

.btn-action {
  width: 100%;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.08);
  padding: 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: all 0.4s ease;
  color: rgba(255,255,255,0.6);
}

.btn-text {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
}

.module-card:hover .btn-action {
  border-color: var(--m-color);
  color: var(--m-color);
  background: rgba(var(--m-color), 0.05);
  box-shadow: 0 0 30px rgba(var(--m-color), 0.1);
}

.bg-glow {
  position: absolute;
  bottom: -100px;
  right: -100px;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle at center, var(--m-color) 0%, transparent 70%);
  opacity: 0.03;
  filter: blur(60px);
  z-index: -1;
  transition: all 0.8s ease;
}

.module-card:hover .bg-glow {
  opacity: 0.1;
  transform: scale(1.2);
}

.corner-accents .accent {
  position: absolute;
  width: 15px;
  height: 15px;
  border: 1px solid rgba(255,255,255,0.1);
  opacity: 0.5;
}

.accent.tl { top: 1rem; left: 1rem; border-right: none; border-bottom: none; }
.accent.br { bottom: 1rem; right: 1rem; border-left: none; border-top: none; }

.module-card:hover {
  transform: translateY(-8px);
  border-color: rgba(var(--m-color), 0.2);
  background: rgba(10, 12, 16, 0.6);
}

.scanline-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, 
    transparent 50%, 
    rgba(255,255,255,0.01) 50%
  );
  background-size: 100% 4px;
  pointer-events: none;
  opacity: 0.5;
}
</style>

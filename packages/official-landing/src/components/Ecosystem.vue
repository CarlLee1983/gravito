<script setup lang="ts">
const modules = [
  {
    id: 'ATLAS',
    name: 'Atlas Engine',
    desc: 'The gravitational bedrock for data. A high-performance, type-safe ORM supporting PostgreSQL, MySQL, and SQLite.',
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
        <span class="sect-tag">MODULAR架构</span>
        <h2 class="text-gradient">The Gravito Ecosystem</h2>
        <p>Pick the modules you need. Each one is a standalone star, together they form a powerful galaxy.</p>
      </div>

      <div class="module-grid">
        <div v-for="m in modules" :key="m.id" class="module-card glass-pane" :style="{ '--m-color': m.color }">
          <div class="card-header">
            <span class="m-tag">{{ m.tag }}</span>
            <span class="m-id">{{ m.id }}-01</span>
          </div>
          
          <div class="card-body">
            <h3>{{ m.name }}</h3>
            <p>{{ m.desc }}</p>
            
            <ul class="feature-list">
              <li v-for="f in m.features" :key="f">
                <span class="dot"></span> {{ f }}
              </li>
            </ul>
          </div>

          <div class="card-footer">
            <div class="btn-outline">EXPLORE SPECIFICATIONS</div>
          </div>

          <div class="bg-glow"></div>
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
  max-width: 1400px;
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
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2.5rem;
}

.module-card {
  position: relative;
  padding: 3.5rem;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  border-radius: 4px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2.5rem;
}

.m-tag {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.2em;
  color: var(--m-color);
  background: rgba(var(--m-color), 0.1);
  padding: 4px 8px;
  border: 1px solid rgba(var(--m-color), 0.2);
}

.m-id {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  color: rgba(255,255,255,0.2);
}

.card-body {
  flex: 1;
}

.card-body h3 {
  font-size: 1.75rem;
  margin-bottom: 1rem;
  letter-spacing: -0.02em;
}

.card-body p {
  color: rgba(255,255,255,0.5);
  margin-bottom: 2.5rem;
  font-size: 1rem;
  line-height: 1.6;
}

.feature-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.feature-list li {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: rgba(255,255,255,0.7);
  display: flex;
  align-items: center;
  gap: 12px;
}

.dot {
  width: 4px;
  height: 4px;
  background: var(--m-color);
  border-radius: 50%;
  box-shadow: 0 0 10px var(--m-color);
}

.card-footer {
  margin-top: 3rem;
}

.btn-outline {
  width: 100%;
  padding: 1rem;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  border: 1px solid rgba(255,255,255,0.1);
  cursor: pointer;
  transition: all 0.3s ease;
}

.module-card:hover .btn-outline {
  border-color: var(--m-color);
  color: var(--m-color);
  background: rgba(var(--m-color), 0.05);
}

.bg-glow {
  position: absolute;
  bottom: -50px;
  right: -50px;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle at center, var(--m-color) 0%, transparent 70%);
  opacity: 0.05;
  filter: blur(40px);
  z-index: -1;
  transition: all 0.6s ease;
}

.module-card:hover .bg-glow {
  opacity: 0.15;
  transform: scale(1.5);
}

.module-card:hover {
  transform: translateY(-10px);
  border-color: rgba(var(--m-color), 0.3);
}
</style>

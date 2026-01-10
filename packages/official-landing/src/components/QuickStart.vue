<script setup lang="ts">
import { ref } from 'vue';

const steps = [
  {
    title: 'Initialize Core',
    desc: 'Install the core engine into your project.',
    cmd: 'bun add @gravito/core'
  },
  {
    title: 'Defining Routes',
    desc: 'Create a high-performance entry point.',
    code: `import { Gravito } from '@gravito/core';

const app = new Gravito();
app.get('/', (c) => c.text('Hello Galaxy'));

export default app;`
  },
  {
    title: 'Ignition',
    desc: 'Launch your server with Bun.',
    cmd: 'bun src/index.ts'
  }
];

const activeStep = ref(0);
const copySuccess = ref(false);

const copyText = (text: string) => {
  navigator.clipboard.writeText(text);
  copySuccess.value = true;
  setTimeout(() => copySuccess.value = false, 2000);
};
</script>

<template>
  <section class="quickstart">
    <div class="container">
      <div class="qs-header">
        <h2 class="text-gradient">Ready for Ignition?</h2>
        <p>Go from zero to a high-performance Bun server in under a minute.</p>
      </div>

      <div class="qs-layout glass-pane">
        <!-- Sidebar Steps -->
        <div class="qs-sidebar">
          <div 
            v-for="(s, i) in steps" 
            :key="s.title" 
            class="step-item"
            :class="{ active: activeStep === i }"
            @click="activeStep = i"
          >
            <div class="step-num">0{{ i + 1 }}</div>
            <div class="step-content">
              <h4>{{ s.title }}</h4>
              <p>{{ s.desc }}</p>
            </div>
          </div>
        </div>

        <!-- Terminal View -->
        <div class="qs-terminal">
          <div class="terminal-header">
            <div class="dots">
              <span></span><span></span><span></span>
            </div>
            <div class="tab">index.ts</div>
            <button class="copy-cmd" @click="copyText(steps[activeStep].cmd || steps[activeStep].code || '')">
              {{ copySuccess ? 'COPIED' : 'COPY' }}
            </button>
          </div>
          <div class="terminal-body">
            <pre v-if="steps[activeStep].code"><code>{{ steps[activeStep].code }}</code></pre>
            <div v-else class="cmd-line">
              <span class="prompt">$</span> {{ steps[activeStep].cmd }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.quickstart {
  padding: 12rem 2rem;
}

.container {
  max-width: 1100px;
  margin: 0 auto;
}

.qs-header {
  text-align: center;
  margin-bottom: 5rem;
}

.qs-header h2 {
  font-size: 3.5rem;
  margin-bottom: 1.5rem;
}

.qs-layout {
  display: grid;
  grid-template-columns: 350px 1fr;
  height: 500px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.05);
}

.qs-sidebar {
  background: rgba(255,255,255,0.02);
  border-right: 1px solid rgba(255,255,255,0.05);
  display: flex;
  flex-direction: column;
}

.step-item {
  padding: 2rem;
  display: flex;
  gap: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  border-bottom: 1px solid rgba(255,255,255,0.02);
}

.step-item:hover {
  background: rgba(255,255,255,0.03);
}

.step-item.active {
  background: rgba(99, 102, 241, 0.05);
  border-right: 2px solid var(--core-glow);
}

.step-num {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--core-glow);
  opacity: 0.5;
}

.step-item.active .step-num {
  opacity: 1;
}

.step-content h4 {
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}

.step-content p {
  font-size: 0.9rem;
  color: rgba(255,255,255,0.4);
}

.qs-terminal {
  background: #05070a;
  display: flex;
  flex-direction: column;
}

.terminal-header {
  padding: 1rem 1.5rem;
  background: rgba(255,255,255,0.03);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dots {
  display: flex;
  gap: 8px;
}

.dots span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
}

.tab {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: rgba(255,255,255,0.4);
}

.copy-cmd {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.5);
  padding: 4px 12px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.copy-cmd:hover {
  border-color: var(--core-glow);
  color: white;
}

.terminal-body {
  flex: 1;
  padding: 3rem;
  font-family: var(--font-mono);
  font-size: 1rem;
  color: rgba(255,255,255,0.8);
  line-height: 1.5;
}

pre {
  margin: 0;
}

code {
  color: #a5b4fc;
}

.cmd-line {
  display: flex;
  gap: 1rem;
}

.prompt {
  color: var(--core-glow);
  font-weight: 800;
}
</style>

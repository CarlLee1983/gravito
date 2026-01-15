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
              <span class="d-red"></span><span class="d-yellow"></span><span class="d-green"></span>
            </div>
            <div class="tab">PROJECT_INIT / index.ts</div>
            <button class="copy-cmd" @click="copyText(steps[activeStep].cmd || steps[activeStep].code || '')">
              {{ copySuccess ? 'SUCCESS_COPIED' : 'COPY_COMMAND' }}
            </button>
          </div>
          <div class="terminal-body">
            <Transition name="fade-fast" mode="out-in">
              <div :key="activeStep">
                <pre v-if="steps[activeStep].code"><code>{{ steps[activeStep].code }}</code></pre>
                <div v-else class="cmd-line">
                  <span class="prompt">gravito@galaxy:~$</span> {{ steps[activeStep].cmd }}
                  <span class="blink-cursor">_</span>
                </div>
              </div>
            </Transition>
          </div>
          <div class="term-bg-glow"></div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.quickstart {
  padding: 12rem 2rem;
  background: radial-gradient(circle at 50% 100%, rgba(99, 102, 241, 0.03) 0%, transparent 60%);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.qs-header {
  text-align: center;
  margin-bottom: 6rem;
}

.qs-header h2 {
  font-size: 4rem;
  margin-bottom: 1.5rem;
  letter-spacing: -0.04em;
}

.qs-header p {
  font-size: 1.25rem;
  color: var(--stellar-muted);
}

.qs-layout {
  display: grid;
  grid-template-columns: 400px 1fr;
  height: 550px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.05);
  background: rgba(10, 12, 16, 0.4);
}

.qs-sidebar {
  background: rgba(255,255,255,0.01);
  border-right: 1px solid rgba(255,255,255,0.05);
  display: flex;
  flex-direction: column;
}

.step-item {
  padding: 2.5rem;
  display: flex;
  gap: 2rem;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  border-bottom: 1px solid rgba(255,255,255,0.02);
}

.step-item:hover {
  background: rgba(255,255,255,0.02);
}

.step-item.active {
  background: rgba(99, 102, 241, 0.05);
  box-shadow: inset -2px 0 0 var(--core-glow);
}

.step-num {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--core-glow);
  opacity: 0.4;
  margin-top: 4px;
}

.step-item.active .step-num {
  opacity: 1;
  text-shadow: 0 0 10px var(--core-glow);
}

.step-content h4 {
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
  color: #fff;
}

.step-content p {
  font-size: 0.95rem;
  color: rgba(255,255,255,0.4);
  line-height: 1.5;
}

.qs-terminal {
  background: #05070a;
  display: flex;
  flex-direction: column;
  position: relative;
}

.terminal-header {
  padding: 1.25rem 2rem;
  background: rgba(255,255,255,0.02);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.dots {
  display: flex;
  gap: 8px;
}

.dots span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  opacity: 0.3;
}

.d-red { background: #ef4444; }
.d-yellow { background: #f59e0b; }
.d-green { background: #10b981; }

.tab {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: rgba(255,255,255,0.3);
  letter-spacing: 0.1em;
}

.copy-cmd {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.4);
  padding: 6px 14px;
  border-radius: 2px;
  font-family: var(--font-mono);
  font-size: 0.65rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
}

.copy-cmd:hover {
  border-color: var(--core-glow);
  color: white;
  background: rgba(99, 102, 241, 0.1);
}

.terminal-body {
  flex: 1;
  padding: 4rem;
  font-family: var(--font-mono);
  font-size: 1.1rem;
  color: rgba(255,255,255,0.7);
  line-height: 1.7;
  z-index: 2;
}

pre {
  margin: 0;
}

code {
  color: #a5b4fc;
}

.cmd-line {
  display: flex;
  gap: 1.25rem;
  align-items: center;
}

.prompt {
  color: var(--core-glow);
  font-weight: 800;
  opacity: 0.8;
}

.blink-cursor {
  color: var(--core-glow);
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.term-bg-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  height: 80%;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, transparent 70%);
  filter: blur(50px);
  z-index: 1;
  pointer-events: none;
}

.fade-fast-enter-active, .fade-fast-leave-active {
  transition: all 0.2s ease;
}

.fade-fast-enter-from, .fade-fast-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>

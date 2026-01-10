<script setup lang="ts">
import { ref } from 'vue';

const prompts = [
  {
    title: 'High Performance API',
    prompt: 'Using @gravito/core, create a high-performance REST API with context pooling and zero-middleware fast path for GET /health.'
  },
  {
    title: 'Modular MVC Setup',
    prompt: 'Scaffold a new Bun project using @gravito/core and @gravito/atlas following the "Project Galaxy" modular architecture.'
  }
];

const aiContext = `Gravito Core (v1.1.0) Architecture Context:
- Runtime: Bun
- Paradigm: Composition-over-Inheritance, Modular Ecosystem
- Core Packages: @gravito/core (Kernel), @gravito/atlas (ORM/Persistence)
- Design Patterns: Context Pooling, Zero-Middleware Fast Path
- Goal: Extreme Performance & LLM-Friendly DX`;

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  alert('Copied to clipboard!');
};
</script>

<template>
  <section class="ai-hub">
    <div class="hub-bg">
      <img src="../assets/ai_dx.png" alt="" class="bg-image">
      <div class="bg-mask"></div>
    </div>

    <div class="container">
      <div class="header">
        <span class="sect-tag">KNOWLEDGE_LAYER</span>
        <h2 class="text-gradient">AI-Native Ecosystem</h2>
        <p>Optimized for the AI era. Provide your AI agent with the context it needs to build galaxies.</p>
      </div>

      <div class="hub-layout">
        <div class="context-card glass-pane">
          <div class="scanning-beam"></div>
          <div class="card-content">
            <div class="ai-orb">
              <div class="orb-core"></div>
              <div class="orb-ring"></div>
            </div>
            <h3>Copy AI Context</h3>
            <p>Ready to build? Give this context to Cursor or Windsurf to help it understand Gravito's core patterns.</p>
            <button class="btn-primary full-width" @click="copyToClipboard(aiContext)">
              Copy Agent Context
            </button>
          </div>
        </div>

        <div class="prompts-list">
          <div v-for="p in prompts" :key="p.title" class="prompt-item glass-pane" @click="copyToClipboard(p.prompt)">
            <div class="prompt-info">
              <div class="item-id">#GEN-{{ p.title.substring(0,3).toUpperCase() }}</div>
              <h4>{{ p.title }}</h4>
              <code>{{ p.prompt }}</code>
            </div>
            <div class="copy-action">
              <span class="copy-hint">PROMPT_CMD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ai-hub {
  position: relative;
  padding: 12rem 2rem;
  overflow: hidden;
}

.hub-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  opacity: 0.15;
  pointer-events: none;
}

.bg-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: grayscale(1) brightness(0.6);
}

.bg-mask {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, transparent 0%, #05070a 85%);
}

.container {
  position: relative;
  z-index: 1;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  margin-bottom: 6rem;
  text-align: center;
}

.sect-tag {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.4em;
  color: #6366f1;
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

.hub-layout {
  display: grid;
  grid-template-columns: 450px 1fr;
  gap: 3rem;
  align-items: start;
}

.context-card {
  position: relative;
  padding: 4rem;
  text-align: center;
  overflow: hidden;
}

.scanning-beam {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #6366f1, transparent);
  animation: beam-sweep 4s linear infinite;
  opacity: 0.5;
}

@keyframes beam-sweep {
  0% { top: 0; }
  100% { top: 100%; }
}

.ai-orb {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto 2.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
}

.orb-core {
  width: 40px;
  height: 40px;
  background: #6366f1;
  border-radius: 50%;
  box-shadow: 0 0 40px #6366f1;
  animation: orb-pulse 2s ease-in-out infinite;
}

.orb-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 50%;
  border-style: dashed;
  animation: rotate-slow 10s linear infinite;
}

@keyframes orb-pulse {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.1); opacity: 1; }
}

@keyframes rotate-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.context-card h3 {
  font-size: 2rem;
  margin-bottom: 1rem;
  letter-spacing: -0.02em;
}

.context-card p {
  color: rgba(255,255,255,0.5);
  margin-bottom: 2.5rem;
  line-height: 1.6;
}

.prompts-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.prompt-item {
  padding: 2rem 3rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid rgba(255,255,255,0.03);
}

.prompt-item:hover {
  border-color: rgba(99, 102, 241, 0.4);
  background: rgba(99, 102, 241, 0.05);
  transform: translateX(10px);
}

.item-id {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  color: rgba(99, 102, 241, 0.5);
  margin-bottom: 0.5rem;
}

.prompt-info h4 {
  font-size: 1.2rem;
  margin-bottom: 0.75rem;
  color: #fff;
  letter-spacing: -0.01em;
}

code {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  color: rgba(255,255,255,0.4);
  background: rgba(255,255,255,0.03);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  display: block;
}

.copy-hint {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: #6366f1;
  opacity: 0.6;
}

.prompt-item:hover .copy-hint {
  opacity: 1;
}
</style>

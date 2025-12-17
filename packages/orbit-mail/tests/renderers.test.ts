import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { defineComponent, h } from 'vue';
import { Mailable } from '../src/Mailable';
import { LogTransport } from '../src/transports/LogTransport';

// Mock Config for Mailable
const mockConfig = {
  from: { address: 'test@example.com' },
  transport: new LogTransport(),
};

// React Component
const ReactTestComponent = ({ name }: { name: string }) => {
  return createElement('div', {}, createElement('h1', {}, `Hello ${name}`));
};

// Vue Component
const VueTestComponent = defineComponent({
  props: ['name'],
  render() {
    return h('div', [h('h1', `Hello ${this.name}`)]);
  },
});

class TestReactMail extends Mailable {
  build() {
    return this.react(ReactTestComponent, { name: 'World' }).subject('React Test');
  }
}

class TestVueMail extends Mailable {
  build() {
    return this.vue(VueTestComponent, { name: 'World' }).subject('Vue Test');
  }
}

describe('Renderers', () => {
  it('should render React component to HTML', async () => {
    const mail = new TestReactMail();
    const envelope = await mail.buildEnvelope(mockConfig);
    const { html } = await mail.renderContent();

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<h1>Hello World</h1>');
  });

  it('should render Vue component to HTML', async () => {
    const mail = new TestVueMail();
    const envelope = await mail.buildEnvelope(mockConfig);
    const { html } = await mail.renderContent();

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<h1>Hello World</h1>');
  });
});

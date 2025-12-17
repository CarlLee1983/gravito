import { HtmlRenderer } from './renderers/HtmlRenderer';
import type { Renderer } from './renderers/Renderer';
import { TemplateRenderer } from './renderers/TemplateRenderer';
import type { Address, Attachment, Envelope, MailConfig } from './types';

// Type placeholders for React/Vue components to avoid hard dependencies in core
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ComponentType<P = any> = any;

export abstract class Mailable {
  protected envelope: Partial<Envelope> = {};
  protected renderer?: Renderer;
  private rendererResolver?: () => Promise<Renderer>;
  protected renderData: Record<string, unknown> = {};

  // ===== Fluent API (Envelope Construction) =====

  from(address: string | Address): this {
    this.envelope.from = typeof address === 'string' ? { address } : address;
    return this;
  }

  to(address: string | Address | (string | Address)[]): this {
    this.envelope.to = this.normalizeAddressArray(address);
    return this;
  }

  cc(address: string | Address | (string | Address)[]): this {
    this.envelope.cc = this.normalizeAddressArray(address);
    return this;
  }

  bcc(address: string | Address | (string | Address)[]): this {
    this.envelope.bcc = this.normalizeAddressArray(address);
    return this;
  }

  replyTo(address: string | Address): this {
    this.envelope.replyTo = typeof address === 'string' ? { address } : address;
    return this;
  }

  subject(subject: string): this {
    this.envelope.subject = subject;
    return this;
  }

  priority(level: 'high' | 'normal' | 'low'): this {
    this.envelope.priority = level;
    return this;
  }

  attach(attachment: Attachment): this {
    this.envelope.attachments = this.envelope.attachments || [];
    this.envelope.attachments.push(attachment);
    return this;
  }

  // ===== Content Methods (Renderer Selection) =====

  /**
   * Set the content using raw HTML string.
   */
  html(content: string): this {
    this.renderer = new HtmlRenderer(content);
    return this;
  }

  /**
   * Set the content using an OrbitView template.
   * @param template Template name (relative to viewsDir/emails)
   * @param data Data to pass to the template
   */
  view(template: string, data?: Record<string, unknown>): this {
    this.renderer = new TemplateRenderer(template, undefined); // Dir will be injected later if possible, or use default
    this.renderData = data || {};
    return this;
  }

  /**
   * Set the content using a React component.
   * Dynamically imports ReactRenderer to avoid hard dependency errors if React is not installed.
   */
  react<P extends object>(component: ComponentType<P>, props?: P): this {
    this.rendererResolver = async () => {
      const { ReactRenderer } = await import('./renderers/ReactRenderer');
      return new ReactRenderer(component, props);
    };
    return this;
  }

  /**
   * Set the content using a Vue component.
   * Dynamically imports VueRenderer to avoid hard dependency errors if Vue is not installed.
   */
  vue<P extends object>(component: ComponentType<P>, props?: P): this {
    this.rendererResolver = async () => {
      const { VueRenderer } = await import('./renderers/VueRenderer');
      return new VueRenderer(component, props as any);
    };
    return this;
  }

  // ===== Life Cycle =====

  /**
   * Setup the mailable. This is where you call from(), to(), view(), etc.
   */
  abstract build(): this;

  // ===== Internal Systems =====

  /**
   * Compile the envelope based on config defaults and mailable settings.
   */
  async buildEnvelope(configPromise: MailConfig | Promise<MailConfig>): Promise<Envelope> {
    const config = await Promise.resolve(configPromise);
    this.build(); // User logic executes here

    // Ensure Renderer is initialized if using TemplateRenderer with config path
    if (this.renderer instanceof TemplateRenderer && config.viewsDir) {
      // Here we could re-initialize TemplateRenderer if we had a setter for viewsDir
      // For now, it defaults to process.cwd()/src/emails which is standard
    }

    return {
      from: this.envelope.from || config.from,
      to: this.envelope.to || [],
      cc: this.envelope.cc,
      bcc: this.envelope.bcc,
      replyTo: this.envelope.replyTo,
      subject: this.envelope.subject || '(No Subject)',
      priority: this.envelope.priority || 'normal',
      attachments: this.envelope.attachments,
    };
  }

  /**
   * execute the renderer
   */
  async renderContent(): Promise<{ html: string; text?: string }> {
    // Resolve lazy renderer if needed
    if (!this.renderer && this.rendererResolver) {
      this.renderer = await this.rendererResolver();
    }

    if (!this.renderer) {
      throw new Error('No content renderer specified. Use html(), view(), react(), or vue().');
    }
    return this.renderer.render(this.renderData);
  }

  private normalizeAddressArray(input: string | Address | (string | Address)[]): Address[] {
    const arr = Array.isArray(input) ? input : [input];
    return arr.map((item) => (typeof item === 'string' ? { address: item } : item));
  }
}

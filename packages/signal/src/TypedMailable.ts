import { Mailable } from './Mailable'

/**
 * Abstract base class for strongly-typed Mailable messages.
 *
 * @description
 * TypedMailable extends the base Mailable class to provide compile-time type safety
 * for email data props. This ensures that the data passed to templates, React, or Vue
 * components is correctly typed and validated at build time.
 *
 * @typeParam TData - The shape of data required by this mailable's template/component.
 *                    Must extend Record<string, unknown>.
 *
 * @example
 * ```typescript
 * import { TypedMailable } from '@gravito/signal'
 *
 * // Define the data interface
 * interface WelcomeData {
 *   name: string
 *   email: string
 *   activationUrl: string
 * }
 *
 * // Create strongly-typed mailable
 * class WelcomeEmail extends TypedMailable<WelcomeData> {
 *   protected data: WelcomeData
 *
 *   constructor(data: WelcomeData) {
 *     super()
 *     this.data = data
 *   }
 *
 *   build() {
 *     return this
 *       .to(this.data.email)
 *       .subject('Welcome to Gravito!')
 *       .view('emails/welcome', this.data) // Type-safe: compiler ensures WelcomeData matches template
 *   }
 * }
 *
 * // Usage - compiler enforces correct data shape
 * const email = new WelcomeEmail({
 *   name: 'Alice',
 *   email: 'alice@example.com',
 *   activationUrl: 'https://app.com/activate?token=abc123'
 * })
 *
 * await mail.send(email)
 * ```
 *
 * @example
 * ```typescript
 * // With React components
 * interface InvoiceData {
 *   invoiceNumber: string
 *   amount: number
 *   dueDate: Date
 *   items: Array<{ name: string; price: number }>
 * }
 *
 * class InvoiceEmail extends TypedMailable<InvoiceData> {
 *   protected data: InvoiceData
 *
 *   constructor(data: InvoiceData) {
 *     super()
 *     this.data = data
 *   }
 *
 *   build() {
 *     return this
 *       .to('billing@example.com')
 *       .subject(`Invoice ${this.data.invoiceNumber}`)
 *       .react(InvoiceComponent, this.data) // Type-safe props
 *   }
 * }
 * ```
 *
 * @see {@link Mailable} Base mailable class
 * @see {@link OrbitSignal} Mail service orchestrator
 *
 * @public
 * @since 3.0.0
 */
export abstract class TypedMailable<TData extends Record<string, unknown>> extends Mailable {
  /**
   * The strongly-typed data for this mailable.
   *
   * This property holds the data that will be passed to the template or component
   * during rendering. By defining it as an abstract property with the generic
   * type TData, we force subclasses to provide a concrete, type-safe implementation.
   *
   * @protected
   */
  protected abstract data: TData
}

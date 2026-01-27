import type { Locator, Page } from '@playwright/test'

/**
 * Page Object Model for the Support Chat Widget.
 *
 * This class encapsulates the locators and actions for interacting with the chat widget
 * in end-to-end tests, providing a stable API for test scripts.
 *
 * @example
 * ```typescript
 * const chatPage = new ChatWidgetPage(page);
 * await chatPage.goto();
 * await chatPage.open();
 * await chatPage.sendMessage('Hello');
 * ```
 */
export class ChatWidgetPage {
  /** Playwright page instance */
  readonly page: Page
  /** Locator for the chat trigger button */
  readonly trigger: Locator
  /** Locator for the main chat window container */
  readonly window: Locator
  /** Locator for the message input field */
  readonly input: Locator
  /** Locator for the send message button */
  readonly sendButton: Locator
  /** Locator for the collection of chat messages */
  readonly messages: Locator

  constructor(page: Page) {
    this.page = page
    this.trigger = page.locator('[data-testid="chat-trigger"]')
    this.window = page.locator('[data-testid="chat-window"]')
    this.input = page.locator('[data-testid="chat-input"]')
    this.sendButton = page.locator('[data-testid="chat-send"]')
    this.messages = page.locator('[data-testid="chat-message"]')
  }

  /**
   * Navigates to the demo page containing the chat widget.
   *
   * @returns A promise that resolves when navigation is complete.
   */
  async goto() {
    // Assuming the demo page is at /
    await this.page.goto('/')
  }

  /**
   * Opens the chat window if it is not already visible.
   *
   * @returns A promise that resolves when the window is visible.
   */
  async open() {
    if (!(await this.window.isVisible())) {
      await this.trigger.click()
      await this.window.waitFor({ state: 'visible' })
    }
  }

  /**
   * Closes the chat window if it is currently visible.
   *
   * @returns A promise that resolves when the window is hidden.
   */
  async close() {
    if (await this.window.isVisible()) {
      await this.trigger.click()
      await this.window.waitFor({ state: 'hidden' })
    }
  }

  /**
   * Types and sends a message through the chat interface.
   *
   * @param text - The content of the message to send.
   * @returns A promise that resolves after the message is sent.
   */
  async sendMessage(text: string) {
    await this.input.fill(text)
    await this.sendButton.click()
  }

  /**
   * Gets the total number of messages currently displayed in the chat window.
   *
   * @returns The count of message elements.
   */
  async getMessageCount() {
    return await this.messages.count()
  }

  /**
   * Gets the locator for the last message in the chat list.
   *
   * @returns The locator for the last message element.
   */
  async getLastMessage() {
    return this.messages.last()
  }
}

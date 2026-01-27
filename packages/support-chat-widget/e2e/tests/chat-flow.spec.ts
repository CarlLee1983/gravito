import { expect, test } from '@playwright/test'
import { ChatWidgetPage } from '../pages/ChatWidgetPage'

test.describe('Support Chat Widget Flow', () => {
  let chatWidget: ChatWidgetPage

  test.beforeEach(async ({ page }) => {
    chatWidget = new ChatWidgetPage(page)
    await chatWidget.goto()
  })

  test('should open and close the chat window', async () => {
    await chatWidget.open()
    await expect(chatWidget.window).toBeVisible()

    await chatWidget.close()
    await expect(chatWidget.window).not.toBeVisible()
  })

  test('should be able to send a message', async ({ page }) => {
    await chatWidget.open()

    const messageText = 'Hello, this is an E2E test message'
    await chatWidget.sendMessage(messageText)

    // Verify message appears in the list
    const lastMessage = await chatWidget.getLastMessage()
    await expect(lastMessage).toContainText(messageText)

    // Verify input is cleared
    await expect(chatWidget.input).toHaveValue('')
  })

  test('should not send empty messages', async () => {
    await chatWidget.open()
    const initialCount = await chatWidget.getMessageCount()

    await chatWidget.sendButton.click()

    const finalCount = await chatWidget.getMessageCount()
    expect(finalCount).toBe(initialCount)
  })
})

// Background job for sending welcome emails
interface SendWelcomeEmailPayload {
  userId: string
  email: string
  name: string
}

export const sendWelcomeEmailJob = async (payload: SendWelcomeEmailPayload): Promise<void> => {
  // Simulate email sending
  await new Promise((resolve) => {
    setTimeout(() => {
      console.log(`✓ Welcome email sent to ${payload.email}`)
      resolve(undefined)
    }, 100)
  })
}

export type { SendWelcomeEmailPayload }

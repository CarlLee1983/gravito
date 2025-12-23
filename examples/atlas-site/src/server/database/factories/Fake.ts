export const Fake = {
  name: () => `User ${Math.floor(Math.random() * 10000)}`,
  email: () => `user${Math.floor(Math.random() * 10000)}@example.com`,
  sentence: () => `This is a random sentence ${Math.random().toString(36).substring(7)}`,
  boolean: () => Math.random() > 0.5,
  paragraph: () => `Lorem ipsum dolor sit amet ${Math.random().toString(36).substring(7)}. Consectetur adipiscing elit.`,
}

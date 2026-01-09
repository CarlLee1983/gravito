const config = {
  driver: 'sqlite',
  url: process.env.DATABASE_URL ?? 'sqlite:./flux-enterprise.db',
}

export default config

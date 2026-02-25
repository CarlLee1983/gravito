declare module '@inertiajs/core' {
  interface PageProps {
    auth: {
      user: {
        id: number
        name: string
        email: string
        role: string
      } | null
    }
    flash: {
      success?: string
      error?: string
    }
    [key: string]: unknown
  }
}

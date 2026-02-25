/**
 * Base error class for Nova shell operations.
 * @public
 */
export class NovaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NovaError'
    Object.setPrototypeOf(this, NovaError.prototype)
  }
}

/**
 * Error thrown when a shell command execution fails.
 * @public
 */
export class NovaShellError extends NovaError {
  constructor(
    public readonly exitCode: number,
    public readonly stdout: string,
    public readonly stderr: string,
    public readonly command: string
  ) {
    const message = `Command failed with exit code ${exitCode}: ${command}\n${stderr.trim()}`
    super(message)
    this.name = 'NovaShellError'
    Object.setPrototypeOf(this, NovaShellError.prototype)
  }
}

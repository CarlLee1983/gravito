export type HashAlgorithm = 'bcrypt' | 'argon2id'

export interface HashConfig {
  algorithm?: HashAlgorithm
  bcrypt?: {
    cost?: number
  }
  argon2id?: {
    memoryCost?: number
    timeCost?: number
    parallelism?: number
  }
}

export class HashManager {
  constructor(private readonly config: HashConfig = {}) {}

  async make(value: string): Promise<string> {
    const algorithm = this.config.algorithm ?? 'bcrypt'

    if (algorithm === 'bcrypt') {
      const cost = this.config.bcrypt?.cost ?? 12
      return await Bun.password.hash(value, { algorithm: 'bcrypt', cost })
    }

    const memoryCost = this.config.argon2id?.memoryCost
    const timeCost = this.config.argon2id?.timeCost
    const parallelism = this.config.argon2id?.parallelism

    return await Bun.password.hash(value, {
      algorithm: 'argon2id',
      ...(memoryCost !== undefined ? { memoryCost } : {}),
      ...(timeCost !== undefined ? { timeCost } : {}),
      ...(parallelism !== undefined ? { parallelism } : {}),
    })
  }

  async check(value: string, hashed: string): Promise<boolean> {
    return await Bun.password.verify(value, hashed)
  }

  needsRehash(hashed: string): boolean {
    const algorithm = this.config.algorithm ?? 'bcrypt'

    if (algorithm === 'bcrypt') {
      // $2a$12$...
      const match = hashed.match(/^\$2[abxy]?\$(\d+)\$/)
      if (!match) {
        return true
      }
      const currentCost = Number(match[1])
      const desiredCost = this.config.bcrypt?.cost ?? 12
      return currentCost !== desiredCost
    }

    if (!hashed.startsWith('$argon2id$')) {
      return true
    }

    // $argon2id$v=19$m=65536,t=3,p=4$...
    const params = hashed.split('$')[3] ?? ''
    const map = new Map(params.split(',').map((kv) => kv.split('=') as [string, string]))

    const desiredMemory = this.config.argon2id?.memoryCost
    const desiredTime = this.config.argon2id?.timeCost
    const desiredParallelism = this.config.argon2id?.parallelism

    if (desiredMemory !== undefined && Number(map.get('m')) !== desiredMemory) return true
    if (desiredTime !== undefined && Number(map.get('t')) !== desiredTime) return true
    if (desiredParallelism !== undefined && Number(map.get('p')) !== desiredParallelism) return true

    return false
  }
}

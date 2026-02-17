import { DB } from '@gravito/atlas'

export async function migrate(): Promise<void> {
  const accountsExist = await DB.raw(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='accounts'
  `)
    .then((rows: any) => rows.length > 0)
    .catch(() => false)

  if (!accountsExist) {
    await DB.raw(`
      CREATE TABLE accounts (
        id TEXT PRIMARY KEY,
        owner_name TEXT NOT NULL,
        balance INTEGER NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'TWD',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)
  }

  const transactionsExist = await DB.raw(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='transactions'
  `)
    .then((rows: any) => rows.length > 0)
    .catch(() => false)

  if (!transactionsExist) {
    await DB.raw(`
      CREATE TABLE transactions (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        balance_after INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'TWD',
        reference_id TEXT,
        description TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      )
    `)
    await DB.raw(`CREATE INDEX idx_transactions_account_id ON transactions(account_id)`)
    await DB.raw(`CREATE INDEX idx_transactions_created_at ON transactions(created_at)`)
  }
}

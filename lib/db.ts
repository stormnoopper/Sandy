import 'server-only'

import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('Missing DATABASE_URL')
}

const globalForDb = globalThis as typeof globalThis & {
  postgresSql?: ReturnType<typeof postgres>
  hasEnsuredUsersTable?: boolean
  ensureUsersTablePromise?: Promise<void>
}

export const sql =
  globalForDb.postgresSql ??
  postgres(connectionString, {
    ssl:
      connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
        ? undefined
        : 'require',
  })

if (process.env.NODE_ENV !== 'production') {
  globalForDb.postgresSql = sql
}

export async function ensureUsersTable() {
  if (!globalForDb.hasEnsuredUsersTable) {
    if (!globalForDb.ensureUsersTablePromise) {
      globalForDb.ensureUsersTablePromise = (async () => {
        await sql`
          create table if not exists auth_users (
            id text primary key,
            username text unique,
            name text not null,
            email text not null unique,
            password_hash text not null,
            created_at timestamptz not null default now()
          )
        `

        globalForDb.hasEnsuredUsersTable = true
      })()
    }

    await globalForDb.ensureUsersTablePromise
  }

  await sql`
    alter table auth_users
    add column if not exists username text
  `

  await sql`
    update auth_users
    set username = lower(
      coalesce(
        nullif(split_part(email, '@', 1), ''),
        nullif(regexp_replace(name, '[^a-zA-Z0-9_-]+', '-', 'g'), ''),
        substring(id, 1, 8)
      )
    )
    where username is null
  `

  await sql`
    create unique index if not exists auth_users_username_key
    on auth_users (username)
  `
}

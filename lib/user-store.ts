import 'server-only'

import { randomUUID } from 'crypto'
import { compare, hash } from 'bcryptjs'
import { ensureUsersTable, sql } from '@/lib/db'

type AuthUserRow = {
  id: string
  username: string
  name: string
  email: string
  password_hash: string
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase()
}

function buildInternalEmail(username: string) {
  return `${username}@sandy.local`
}

export async function findUserByUsername(username: string) {
  await ensureUsersTable()

  const normalizedUsername = normalizeUsername(username)
  const [user] = await sql<AuthUserRow[]>`
    select id, username, name, email, password_hash
    from auth_users
    where username = ${normalizedUsername}
    limit 1
  `

  return user ?? null
}

export async function createUser({
  username,
  password,
}: {
  username: string
  password: string
}) {
  await ensureUsersTable()

  const normalizedUsername = normalizeUsername(username)
  const passwordHash = await hash(password, 12)

  try {
    const [user] = await sql<AuthUserRow[]>`
      insert into auth_users (id, username, name, email, password_hash)
      values (
        ${randomUUID()},
        ${normalizedUsername},
        ${normalizedUsername},
        ${buildInternalEmail(normalizedUsername)},
        ${passwordHash}
      )
      returning id, username, name, email, password_hash
    `

    return user
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      throw new Error('USERNAME_IN_USE')
    }

    throw error
  }
}

export async function verifyUserCredentials(username: string, password: string) {
  const user = await findUserByUsername(username)

  if (!user) {
    return null
  }

  const isValid = await compare(password, user.password_hash)
  if (!isValid) {
    return null
  }

  return {
    id: user.id,
    name: user.username,
    email: undefined,
  }
}

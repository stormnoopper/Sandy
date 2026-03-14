'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Loader2, LockKeyhole, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

type AuthMode = 'login' | 'register'

export function AuthForm() {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [keyword, setKeyword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isRegisterMode = mode === 'register'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (isRegisterMode && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      if (isRegisterMode) {
        const registerResponse = await fetch('/api/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username,
            password,
            keyword,
          }),
        })

        const registerResult = await registerResponse.json()

        if (!registerResponse.ok) {
          setError(registerResult.error ?? 'Unable to create your account.')
          return
        }
      }

      const signInResult = await signIn('credentials', {
        username,
        password,
        redirect: false,
      })

      if (signInResult?.error) {
        setError('Invalid username or password.')
        return
      }

      router.push('/')
      router.refresh()
    } catch (submitError) {
      console.error('Authentication request failed:', submitError)
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Sandy</CardTitle>
            <CardDescription>Login or register right from the homepage.</CardDescription>
          </div>
        </div>
        <div className="rounded-lg border bg-muted/40 p-1">
          <div className="grid grid-cols-2 gap-1">
            <Button
              type="button"
              variant={isRegisterMode ? 'ghost' : 'default'}
              onClick={() => {
                setMode('login')
                setError('')
              }}
            >
              Login
            </Button>
            <Button
              type="button"
              variant={isRegisterMode ? 'default' : 'ghost'}
              onClick={() => {
                setMode('register')
                setError('')
              }}
            >
              Register
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="username">Username</FieldLabel>
              <Input
                id="username"
                autoComplete="username"
                placeholder="storm"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                placeholder="At least 6 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
              />
            </Field>

            {isRegisterMode && (
              <Field>
                <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={6}
                  required
                />
              </Field>
            )}

            {isRegisterMode && (
              <Field>
                <FieldLabel htmlFor="keyword">Passcode</FieldLabel>
                <Input
                  id="keyword"
                  type="password"
                  autoComplete="off"
                  placeholder="Enter team passcode"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  required
                />
              </Field>
            )}
          </FieldGroup>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            className="w-full"
            disabled={
              isSubmitting ||
              !username.trim() ||
              !password.trim() ||
              (isRegisterMode && !keyword.trim())
            }
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isRegisterMode ? 'Creating account...' : 'Signing in...'}
              </>
            ) : (
              <>
                <UserRound className="h-4 w-4" />
                {isRegisterMode ? 'Create Account' : 'Login'}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

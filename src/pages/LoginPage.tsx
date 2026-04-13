import { useState } from 'react'
import { signInWithMagicLink } from '@/lib/auth'

const ALLOWED_DOMAIN = 'freshcontext.ai'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    // Check domain
    const domain = email.split('@')[1]?.toLowerCase()
    if (domain !== ALLOWED_DOMAIN) {
      setError(`Only @${ALLOWED_DOMAIN} email addresses are allowed.`)
      setLoading(false)
      return
    }

    try {
      await signInWithMagicLink(email)
      setMessage('Check your email for a sign-in link!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-sm w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-semibold mb-2 text-center">Fresh Context</h1>
        <p className="text-gray-500 text-sm mb-6 text-center">
          Enter your @{ALLOWED_DOMAIN} email to sign in.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder={`you@${ALLOWED_DOMAIN}`}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
          )}
          {message && (
            <p className="text-sm text-green-600 bg-green-50 p-2 rounded">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Sending link...' : 'Send Sign-In Link'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          A magic link will be sent to your email.
        </p>
      </div>
    </div>
  )
}

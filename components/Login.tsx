import React, { useState } from 'react'
import { supabase } from '../utils/supabase'

interface LoginProps {
  onLogin: (user: any) => void
}

export default function Login({ onLogin }: LoginProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Sign in fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Sign up fields
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    if (data.user) {
      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()
      onLogin({ ...data.user, profile })
    }
    setLoading(false)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!username.trim() || !fullName.trim()) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    // Check username availability
    const { data: existing } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username.toLowerCase().trim())
      .single()

    if (existing) {
      setError('Username already taken, please choose another')
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        data: { full_name: fullName, username: username.toLowerCase().trim() }
      }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
      await supabase.from('profiles').insert({
        id: data.user.id,
        username: username.toLowerCase().trim(),
        full_name: fullName,
        avatar_url: avatarUrl,
        bio: '',
        followers: 0,
        following: 0
      })

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      onLogin({ ...data.user, profile })
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '380px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '24px',
        padding: '40px 32px',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px', height: '64px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            borderRadius: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px', margin: '0 auto 12px'
          }}>📈</div>
          <h1 style={{ color: '#fff', fontSize: '28px', fontWeight: '800', margin: 0 }}>SocioTrade</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: '6px 0 0' }}>
            Trade. Connect. Win.
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '28px'
        }}>
          {(['signin', 'signup'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError('') }} style={{
              flex: 1, padding: '10px',
              background: mode === m ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'transparent',
              border: 'none', borderRadius: '10px',
              color: '#fff', fontSize: '14px', fontWeight: '600',
              cursor: 'pointer', transition: 'all 0.2s'
            }}>
              {m === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(255,59,48,0.15)', border: '1px solid rgba(255,59,48,0.3)',
            borderRadius: '10px', padding: '12px 16px',
            color: '#ff3b30', fontSize: '13px', marginBottom: '16px'
          }}>{error}</div>
        )}

        {/* Sign In Form */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn}>
            {[
              { label: 'Email', value: email, set: setEmail, type: 'email', placeholder: 'your@email.com' },
              { label: 'Password', value: password, set: setPassword, type: 'password', placeholder: '••••••••' }
            ].map(f => (
              <div key={f.label} style={{ marginBottom: '16px' }}>
                <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>{f.label}</label>
                <input
                  type={f.type}
                  value={f.value}
                  onChange={e => f.set(e.target.value)}
                  placeholder={f.placeholder}
                  required
                  style={{
                    width: '100%', padding: '14px 16px',
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px', color: '#fff',
                    fontSize: '15px', outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            ))}
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '16px',
              background: loading ? 'rgba(102,126,234,0.5)' : 'linear-gradient(135deg, #667eea, #764ba2)',
              border: 'none', borderRadius: '14px',
              color: '#fff', fontSize: '16px', fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '8px', transition: 'all 0.2s'
            }}>
              {loading ? '⏳ Signing in...' : 'Sign In →'}
            </button>
          </form>
        )}

        {/* Sign Up Form */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp}>
            {[
              { label: 'Full Name', value: fullName, set: setFullName, type: 'text', placeholder: 'John Doe' },
              { label: 'Username', value: username, set: setUsername, type: 'text', placeholder: '@username' },
              { label: 'Email', value: signupEmail, set: setSignupEmail, type: 'email', placeholder: 'your@email.com' },
              { label: 'Password', value: signupPassword, set: setSignupPassword, type: 'password', placeholder: '8+ characters' }
            ].map(f => (
              <div key={f.label} style={{ marginBottom: '14px' }}>
                <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>{f.label}</label>
                <input
                  type={f.type}
                  value={f.value}
                  onChange={e => f.set(e.target.value)}
                  placeholder={f.placeholder}
                  required
                  style={{
                    width: '100%', padding: '14px 16px',
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px', color: '#fff',
                    fontSize: '15px', outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            ))}
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '16px',
              background: loading ? 'rgba(102,126,234,0.5)' : 'linear-gradient(135deg, #667eea, #764ba2)',
              border: 'none', borderRadius: '14px',
              color: '#fff', fontSize: '16px', fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '8px', transition: 'all 0.2s'
            }}>
              {loading ? '⏳ Creating account...' : 'Create Account 🚀'}
            </button>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', textAlign: 'center', marginTop: '16px' }}>
              By signing up you agree to our terms of service
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import { supabase } from '../utils/supabase'

interface LoginProps {
  onLogin: (user: any) => void
}

export default function Login({ onLogin }: LoginProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Sign in fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Sign up fields
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 16px',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '12px', color: '#fff',
    fontSize: '15px', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit'
  }

  const labelStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.7)', fontSize: '13px',
    fontWeight: '600', display: 'block', marginBottom: '6px'
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

      if (authError) {
        // Give human-friendly errors
        if (authError.message.includes('Invalid login')) {
          throw new Error('Wrong email or password. Please try again.')
        } else if (authError.message.includes('Email not confirmed')) {
          throw new Error('Please check your email and click the confirmation link first.')
        } else {
          throw new Error(authError.message)
        }
      }

      if (data.user && data.session) {
        let profile = null
        try {
          const { data: p } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
          profile = p
        } catch {}

        if (!profile) {
          const meta = data.user.user_metadata || {}
          profile = {
            id: data.user.id,
            username: meta.username || email.split('@')[0],
            full_name: meta.full_name || '',
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.user.id}`,
            bio: '', followers: 0, following: 0
          }
        }

        const user = { ...data.user, profile, id: data.user.id }
        onLogin(user)
        setLoading(false)
        return
      }
    } catch (err: any) {
      // Check localStorage fallback
      const users: any[] = JSON.parse(localStorage.getItem('st_users') || '[]')
      const found = users.find((u: any) => u.email === email && u.password === password)
      if (found) {
        onLogin(found)
        setLoading(false)
        return
      }
      setError(err.message || 'Sign in failed. Please try again.')
    }

    setLoading(false)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (!username.trim() || !fullName.trim()) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    if (signupPassword.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '').trim()
    if (!cleanUsername) {
      setError('Username can only contain letters, numbers, and underscores')
      setLoading(false)
      return
    }

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          data: { full_name: fullName, username: cleanUsername }
        }
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('This email is already registered. Try signing in instead.')
        }
        throw new Error(authError.message)
      }

      if (data.user) {
        const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanUsername}`
        const profile = {
          id: data.user.id,
          username: cleanUsername,
          full_name: fullName,
          avatar_url: avatarUrl,
          bio: '',
          followers: 0,
          following: 0
        }

        // Upsert profile (trigger should create it, but ensure it exists)
        try {
          await supabase.from('profiles').upsert(profile)
        } catch {}

        const user = { ...data.user, profile, id: data.user.id }

        // Save locally too
        const users: any[] = JSON.parse(localStorage.getItem('st_users') || '[]')
        localStorage.setItem('st_users', JSON.stringify([...users, { ...user, password: signupPassword }]))

        onLogin(user)
        setLoading(false)
        return
      }
    } catch (err: any) {
      // localStorage fallback sign up
      const users: any[] = JSON.parse(localStorage.getItem('st_users') || '[]')
      if (users.find((u: any) => u.profile?.username === username.toLowerCase().trim())) {
        setError('Username already taken')
        setLoading(false)
        return
      }

      const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
      const newUser = {
        id: `local_${Date.now()}`,
        email: signupEmail,
        password: signupPassword,
        profile: {
          id: `local_${Date.now()}`,
          username: username.toLowerCase().trim(),
          full_name: fullName,
          avatar_url: avatarUrl,
          bio: '',
          followers: 0,
          following: 0
        }
      }
      localStorage.setItem('st_users', JSON.stringify([...users, newUser]))
      onLogin(newUser)
      setLoading(false)
      return
    }

    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        width: '100%', maxWidth: '380px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '24px', padding: '40px 32px',
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
          display: 'flex', background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px', padding: '4px', marginBottom: '24px'
        }}>
          {(['signin', 'signup'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); setSuccess('') }} style={{
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

        {error && (
          <div style={{
            background: 'rgba(255,59,48,0.15)', border: '1px solid rgba(255,59,48,0.3)',
            borderRadius: '10px', padding: '12px 16px',
            color: '#ff3b30', fontSize: '13px', marginBottom: '16px', lineHeight: '1.5'
          }}>{error}</div>
        )}

        {success && (
          <div style={{
            background: 'rgba(52,199,89,0.15)', border: '1px solid rgba(52,199,89,0.3)',
            borderRadius: '10px', padding: '12px 16px',
            color: '#34c759', fontSize: '13px', marginBottom: '16px', lineHeight: '1.5'
          }}>{success}</div>
        )}

        {mode === 'signin' ? (
          <form onSubmit={handleSignIn}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com" required style={inputStyle} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required style={inputStyle} />
            </div>
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '16px',
              background: loading ? 'rgba(102,126,234,0.5)' : 'linear-gradient(135deg, #667eea, #764ba2)',
              border: 'none', borderRadius: '14px',
              color: '#fff', fontSize: '16px', fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}>
              {loading ? '⏳ Signing in...' : 'Sign In →'}
            </button>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', textAlign: 'center', marginTop: '14px' }}>
              Don't have an account?{' '}
              <span onClick={() => setMode('signup')} style={{ color: '#667eea', cursor: 'pointer', fontWeight: '600' }}>
                Sign Up
              </span>
            </p>
          </form>
        ) : (
          <form onSubmit={handleSignUp}>
            {[
              { label: 'Full Name', value: fullName, set: setFullName, type: 'text', ph: 'John Doe' },
              { label: 'Username', value: username, set: setUsername, type: 'text', ph: 'johndoe (letters & numbers only)' },
              { label: 'Email', value: signupEmail, set: setSignupEmail, type: 'email', ph: 'your@email.com' },
              { label: 'Password', value: signupPassword, set: setSignupPassword, type: 'password', ph: 'At least 6 characters' },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>{f.label}</label>
                <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)}
                  placeholder={f.ph} required style={inputStyle} />
              </div>
            ))}
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '16px',
              background: loading ? 'rgba(102,126,234,0.5)' : 'linear-gradient(135deg, #667eea, #764ba2)',
              border: 'none', borderRadius: '14px',
              color: '#fff', fontSize: '16px', fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '4px'
            }}>
              {loading ? '⏳ Creating account...' : 'Create Account 🚀'}
            </button>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', textAlign: 'center', marginTop: '14px' }}>
              By signing up you agree to our terms
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

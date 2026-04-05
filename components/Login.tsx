import React, { useState } from 'react'

interface LoginProps {
  onLogin: (user: any) => void
}

export default function Login({ onLogin }: LoginProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 16px',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '12px', color: '#fff',
    fontSize: '15px', outline: 'none',
    boxSizing: 'border-box'
  }

  const labelStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.7)', fontSize: '13px',
    fontWeight: '600', display: 'block', marginBottom: '6px'
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Try Supabase first
      const { supabase } = await import('../utils/supabase')
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

      if (authError) throw new Error(authError.message)

      if (data.user) {
        let profile = null
        try {
          const { data: p } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
          profile = p
        } catch {}
        onLogin({ ...data.user, profile, id: data.user.id })
        setLoading(false)
        return
      }
    } catch (err: any) {
      // Fall back to localStorage auth
    }

    // localStorage fallback
    const users: any[] = JSON.parse(localStorage.getItem('st_users') || '[]')
    const found = users.find((u: any) => u.email === email && u.password === password)
    if (found) {
      onLogin(found)
    } else {
      setError('Invalid email or password')
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

    // Check username taken (localStorage)
    const users: any[] = JSON.parse(localStorage.getItem('st_users') || '[]')
    if (users.find((u: any) => u.profile?.username === username.toLowerCase().trim())) {
      setError('Username already taken')
      setLoading(false)
      return
    }

    try {
      // Try Supabase first
      const { supabase } = await import('../utils/supabase')
      const { data, error: authError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: { data: { full_name: fullName, username: username.toLowerCase().trim() } }
      })

      if (authError) throw new Error(authError.message)

      if (data.user) {
        const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
        const profile = {
          id: data.user.id,
          username: username.toLowerCase().trim(),
          full_name: fullName,
          avatar_url: avatarUrl,
          bio: '',
          followers: 0,
          following: 0
        }
        try {
          await supabase.from('profiles').upsert(profile)
        } catch {}
        const newUser = { ...data.user, profile, id: data.user.id }
        // Also save locally
        const updatedUsers = [...users, { ...newUser, password: signupPassword }]
        localStorage.setItem('st_users', JSON.stringify(updatedUsers))
        onLogin(newUser)
        setLoading(false)
        return
      }
    } catch (err: any) {
      // Fall back to localStorage
    }

    // localStorage fallback — create account locally
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
    const updatedUsers = [...users, newUser]
    localStorage.setItem('st_users', JSON.stringify(updatedUsers))
    onLogin(newUser)
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
            <button key={m} onClick={() => { setMode(m); setError('') }} style={{
              flex: 1, padding: '10px',
              background: mode === m ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'transparent',
              border: 'none', borderRadius: '10px',
              color: '#fff', fontSize: '14px', fontWeight: '600',
              cursor: 'pointer'
            }}>
              {m === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {error && (
          <div style={{
            background: 'rgba(255,59,48,0.15)', border: '1px solid rgba(255,59,48,0.3)',
            borderRadius: '10px', padding: '12px 16px',
            color: '#ff3b30', fontSize: '13px', marginBottom: '16px'
          }}>{error}</div>
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
          </form>
        ) : (
          <form onSubmit={handleSignUp}>
            {[
              { label: 'Full Name', value: fullName, set: setFullName, type: 'text', ph: 'John Doe' },
              { label: 'Username', value: username, set: setUsername, type: 'text', ph: 'johndoe' },
              { label: 'Email', value: signupEmail, set: setSignupEmail, type: 'email', ph: 'your@email.com' },
              { label: 'Password', value: signupPassword, set: setSignupPassword, type: 'password', ph: '8+ characters' },
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

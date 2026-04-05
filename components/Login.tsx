import React, { useState } from 'react'
import { supabase } from '../utils/supabase'

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

  const inp: React.CSSProperties = {
    width: '100%', padding: '14px 16px',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '12px', color: '#fff',
    fontSize: '15px', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit'
  }
  const lbl: React.CSSProperties = {
    color: 'rgba(255,255,255,0.6)', fontSize: '13px',
    fontWeight: '600', display: 'block', marginBottom: '6px'
  }

  // Build a full user object from Supabase auth user + profile
  const buildUser = async (authUser: any) => {
    let profile: any = null
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', authUser.id).single()
      profile = data
    } catch {}

    if (!profile) {
      const meta = authUser.user_metadata || {}
      profile = {
        id: authUser.id,
        username: meta.username || authUser.email?.split('@')[0] || 'user',
        full_name: meta.full_name || '',
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.id}`,
        bio: '', followers: 0, following: 0
      }
      // Try to create it now
      try { await supabase.from('profiles').upsert(profile) } catch {}
    }

    return { ...authUser, profile, id: authUser.id }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) { setError('Please fill in all fields'); return }
    setLoading(true); setError('')

    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (authErr) {
        if (authErr.message.toLowerCase().includes('invalid')) throw new Error('Wrong email or password.')
        if (authErr.message.toLowerCase().includes('confirmed')) throw new Error('Please confirm your email first.')
        throw new Error(authErr.message)
      }
      if (data?.user) {
        const user = await buildUser(data.user)
        localStorage.setItem('sociotrade_user', JSON.stringify(user))
        onLogin(user)
        return
      }
    } catch (err: any) {
      // Try localStorage fallback
      const users: any[] = JSON.parse(localStorage.getItem('st_users') || '[]')
      const found = users.find((u: any) => u.email === email.trim() && u.password === password)
      if (found) { onLogin(found); setLoading(false); return }
      setError(err.message || 'Sign in failed. Please try again.')
    }
    setLoading(false)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim() || !username.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields'); return
    }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }

    const cleanUser = username.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30)
    if (!cleanUser) { setError('Username can only have letters, numbers, and underscores'); return }

    setLoading(true); setError('')

    try {
      const { data, error: authErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim(), username: cleanUser } }
      })

      if (authErr) {
        if (authErr.message.toLowerCase().includes('registered')) throw new Error('Email already registered. Try signing in.')
        throw new Error(authErr.message)
      }

      if (data?.user) {
        const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanUser}`
        const profile = {
          id: data.user.id,
          username: cleanUser,
          full_name: fullName.trim(),
          avatar_url: avatarUrl,
          bio: '', followers: 0, following: 0
        }

        // Upsert profile (trigger may have already done it)
        try { await supabase.from('profiles').upsert(profile) } catch {}

        const user = { ...data.user, profile, id: data.user.id }
        // Save locally too
        const users: any[] = JSON.parse(localStorage.getItem('st_users') || '[]')
        localStorage.setItem('st_users', JSON.stringify([...users, { ...user, password }]))
        localStorage.setItem('sociotrade_user', JSON.stringify(user))
        onLogin(user)
        return
      }
    } catch (err: any) {
      // Offline fallback: create local-only account
      const users: any[] = JSON.parse(localStorage.getItem('st_users') || '[]')
      if (users.find((u: any) => u.profile?.username === cleanUser)) {
        setError('Username already taken locally'); setLoading(false); return
      }
      const newUser = {
        id: `local_${Date.now()}`,
        email: email.trim(),
        password,
        profile: {
          id: `local_${Date.now()}`,
          username: cleanUser,
          full_name: fullName.trim(),
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanUser}`,
          bio: '', followers: 0, following: 0
        }
      }
      localStorage.setItem('st_users', JSON.stringify([...users, newUser]))
      localStorage.setItem('sociotrade_user', JSON.stringify(newUser))
      onLogin(newUser)
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg,#0f0f1a 0%,#1a1a2e 50%,#16213e 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div style={{
        width: '100%', maxWidth: '380px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '24px', padding: '36px 28px',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '68px', height: '68px',
            background: 'linear-gradient(135deg,#667eea,#764ba2)',
            borderRadius: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '30px', margin: '0 auto 12px', boxShadow: '0 8px 24px rgba(102,126,234,0.4)'
          }}>📈</div>
          <h1 style={{ color: '#fff', fontSize: '26px', fontWeight: '800', margin: 0 }}>SocioTrade</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', margin: '6px 0 0' }}>Trade. Connect. Win.</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '4px', marginBottom: '22px' }}>
          {(['signin', 'signup'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError('') }} style={{
              flex: 1, padding: '10px',
              background: mode === m ? 'linear-gradient(135deg,#667eea,#764ba2)' : 'transparent',
              border: 'none', borderRadius: '10px',
              color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer'
            }}>
              {m === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {error && (
          <div style={{
            background: 'rgba(255,59,48,0.15)', border: '1px solid rgba(255,59,48,0.3)',
            borderRadius: '10px', padding: '12px 16px',
            color: '#ff6b6b', fontSize: '13px', marginBottom: '16px', lineHeight: '1.5'
          }}>{error}</div>
        )}

        {mode === 'signin' ? (
          <form onSubmit={handleSignIn}>
            <div style={{ marginBottom: '14px' }}>
              <label style={lbl}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com" required style={inp} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={lbl}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required style={inp} />
            </div>
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '16px',
              background: loading ? 'rgba(102,126,234,0.5)' : 'linear-gradient(135deg,#667eea,#764ba2)',
              border: 'none', borderRadius: '14px', color: '#fff',
              fontSize: '16px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(102,126,234,0.35)'
            }}>
              {loading ? '⏳ Signing in...' : 'Sign In →'}
            </button>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', textAlign: 'center', marginTop: '16px' }}>
              No account?{' '}
              <span onClick={() => setMode('signup')} style={{ color: '#667eea', cursor: 'pointer', fontWeight: '700' }}>
                Sign Up free
              </span>
            </p>
          </form>
        ) : (
          <form onSubmit={handleSignUp}>
            {[
              { label: 'Full Name', value: fullName, set: setFullName, type: 'text', ph: 'Your name' },
              { label: 'Username', value: username, set: setUsername, type: 'text', ph: 'letters, numbers, _ only' },
              { label: 'Email', value: email, set: setEmail, type: 'email', ph: 'your@email.com' },
              { label: 'Password', value: password, set: setPassword, type: 'password', ph: 'Min 6 characters' },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: '14px' }}>
                <label style={lbl}>{f.label}</label>
                <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)}
                  placeholder={f.ph} required style={inp} />
              </div>
            ))}
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '16px',
              background: loading ? 'rgba(102,126,234,0.5)' : 'linear-gradient(135deg,#667eea,#764ba2)',
              border: 'none', borderRadius: '14px', color: '#fff',
              fontSize: '16px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '4px',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(102,126,234,0.35)'
            }}>
              {loading ? '⏳ Creating account...' : 'Create Account 🚀'}
            </button>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', textAlign: 'center', marginTop: '14px' }}>
              By signing up you agree to our terms of service
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

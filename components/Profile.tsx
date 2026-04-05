import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import { isVerified, getVerifiedBadgeColor } from '../utils/verified'

interface ProfileProps {
  currentUser: any
  onLogout: () => void
}

type Screen = 'profile' | 'edit' | 'settings'

export default function Profile({ currentUser, onLogout }: ProfileProps) {
  const [screen, setScreen] = useState<Screen>('profile')
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Edit profile fields
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [website, setWebsite] = useState('')

  // Settings toggles
  const [settings, setSettings] = useState({
    pushNotifications: true,
    emailAlerts: false,
    tradeAlerts: true,
    signalAlerts: true,
    privateAccount: false,
    showPortfolio: true,
    showOnLeaderboard: true,
    darkMode: true,
    compactFeed: false,
    soundEffects: false,
  })

  const profile = currentUser?.profile
  const userVerified = isVerified({ email: currentUser?.email, username: profile?.username || username, followers: profile?.followers || 0 })
  const isOwner = currentUser?.email === 'abdijabarmuhammad7@gmail.com' || (profile?.username || username) === 'abdijabar350'

  useEffect(() => {
    if (!currentUser?.id) return
    setFullName(profile?.full_name || '')
    setUsername(profile?.username || '')
    setBio(profile?.bio || '')
    setAvatarUrl(profile?.avatar_url || '')
    setWebsite(profile?.website || '')

    // Load settings from localStorage
    const saved = localStorage.getItem('sociotrade_settings')
    if (saved) {
      try { setSettings(JSON.parse(saved)) } catch {}
    }

    supabase
      .from('posts')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPosts(data || [])
        setLoading(false)
      })
      .catch(() => {
        // fallback to localStorage
        const local = JSON.parse(localStorage.getItem('sociotrade_posts') || '[]')
        const mine = local.filter((p: any) => p.user_id === currentUser.id)
        setPosts(mine)
        setLoading(false)
      })
  }, [currentUser])

  const handleSaveProfile = async () => {
    setSaving(true)
    const updates = {
      full_name: fullName,
      username,
      bio,
      avatar_url: avatarUrl,
      website,
      updated_at: new Date().toISOString()
    }

    try {
      await supabase.from('profiles').update(updates).eq('id', currentUser.id)
    } catch {}

    // Always save locally too
    const storedUser = JSON.parse(localStorage.getItem('sociotrade_user') || '{}')
    if (storedUser.id === currentUser.id) {
      storedUser.profile = { ...storedUser.profile, ...updates }
      localStorage.setItem('sociotrade_user', JSON.stringify(storedUser))
    }

    setSaving(false)
    setSaveMsg('✅ Profile saved!')
    setTimeout(() => {
      setSaveMsg('')
      setScreen('profile')
    }, 1200)
  }

  const handleSaveSettings = () => {
    localStorage.setItem('sociotrade_settings', JSON.stringify(settings))
    setSaveMsg('✅ Settings saved!')
    setTimeout(() => setSaveMsg(''), 1500)
  }

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleLogout = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      onLogout()
    }
  }

  const avatarSrc = avatarUrl || profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.id}`

  // ─── EDIT PROFILE SCREEN ───────────────────────────────────────────
  if (screen === 'edit') {
    return (
      <div style={{ paddingBottom: '80px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={() => setScreen('profile')} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: '#fff', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: '800', margin: 0, flex: 1 }}>Edit Profile</h2>
          <button onClick={handleSaveProfile} disabled={saving} style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none', borderRadius: '20px', padding: '8px 18px', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {saveMsg && (
          <div style={{ margin: '12px 16px', padding: '10px 16px', background: 'rgba(52,199,89,0.15)', border: '1px solid rgba(52,199,89,0.3)', borderRadius: '10px', color: '#34c759', fontSize: '14px', fontWeight: '600' }}>{saveMsg}</div>
        )}

        {/* Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px 16px' }}>
          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <img src={avatarSrc} style={{ width: '90px', height: '90px', borderRadius: '50%', border: '3px solid #667eea', background: '#333', objectFit: 'cover' }} alt="" />
            <div style={{ position: 'absolute', bottom: '0', right: '0', background: '#667eea', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>📷</div>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: 0 }}>Paste an image URL below to change your photo</p>
        </div>

        {/* Form */}
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[
            { label: 'Avatar URL', value: avatarUrl, set: setAvatarUrl, placeholder: 'https://example.com/photo.jpg', icon: '🖼️' },
            { label: 'Full Name', value: fullName, set: setFullName, placeholder: 'Your name', icon: '👤' },
            { label: 'Username', value: username, set: setUsername, placeholder: '@username', icon: '🏷️' },
            { label: 'Website', value: website, set: setWebsite, placeholder: 'https://yoursite.com', icon: '🔗' },
          ].map(field => (
            <div key={field.label}>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: '600', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{field.icon} {field.label}</label>
              <input
                value={field.value}
                onChange={e => field.set(e.target.value)}
                placeholder={field.placeholder}
                style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>
          ))}

          {/* Bio */}
          <div>
            <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: '600', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📝 Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell the world about yourself — your trading style, strategy, or anything..."
              maxLength={160}
              rows={4}
              style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
            />
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', textAlign: 'right', marginTop: '4px' }}>{bio.length}/160</div>
          </div>

          <button onClick={handleSaveProfile} disabled={saving} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none', borderRadius: '14px', color: '#fff', fontSize: '16px', fontWeight: '700', cursor: 'pointer', marginTop: '8px' }}>
            {saving ? '⏳ Saving...' : '💾 Save Profile'}
          </button>
        </div>
      </div>
    )
  }

  // ─── SETTINGS SCREEN ───────────────────────────────────────────────
  if (screen === 'settings') {
    const settingGroups = [
      {
        title: '🔔 Notifications',
        items: [
          { key: 'pushNotifications', label: 'Push Notifications', desc: 'Get notified about likes & follows' },
          { key: 'emailAlerts', label: 'Email Alerts', desc: 'Receive digest emails' },
          { key: 'tradeAlerts', label: 'Trade Alerts', desc: 'Price alerts on your watchlist' },
          { key: 'signalAlerts', label: 'Signal Alerts', desc: 'Notify when someone posts a signal' },
        ]
      },
      {
        title: '🔒 Privacy',
        items: [
          { key: 'privateAccount', label: 'Private Account', desc: 'Only approved followers see your posts' },
          { key: 'showPortfolio', label: 'Show Portfolio Value', desc: 'Others can see your portfolio total' },
          { key: 'showOnLeaderboard', label: 'Show on Leaderboard', desc: 'Appear in top trader rankings' },
        ]
      },
      {
        title: '🎨 Appearance',
        items: [
          { key: 'darkMode', label: 'Dark Mode', desc: 'Dark theme (recommended)' },
          { key: 'compactFeed', label: 'Compact Feed', desc: 'Show more posts on screen' },
          { key: 'soundEffects', label: 'Sound Effects', desc: 'Play sounds on trades' },
        ]
      }
    ]

    return (
      <div style={{ paddingBottom: '80px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={() => setScreen('profile')} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: '#fff', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: '800', margin: 0, flex: 1 }}>Settings</h2>
        </div>

        {saveMsg && (
          <div style={{ margin: '12px 16px', padding: '10px 16px', background: 'rgba(52,199,89,0.15)', border: '1px solid rgba(52,199,89,0.3)', borderRadius: '10px', color: '#34c759', fontSize: '14px', fontWeight: '600' }}>{saveMsg}</div>
        )}

        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {settingGroups.map(group => (
            <div key={group.title}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>{group.title}</div>
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                {group.items.map((item, i) => (
                  <div key={item.key} onClick={() => toggleSetting(item.key as keyof typeof settings)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', cursor: 'pointer',
                    borderBottom: i < group.items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none'
                  }}>
                    <div>
                      <div style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>{item.label}</div>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '2px' }}>{item.desc}</div>
                    </div>
                    {/* Toggle switch */}
                    <div style={{
                      width: '48px', height: '28px', borderRadius: '14px', position: 'relative',
                      background: settings[item.key as keyof typeof settings] ? 'linear-gradient(135deg,#667eea,#764ba2)' : 'rgba(255,255,255,0.12)',
                      transition: 'background 0.2s', flexShrink: 0
                    }}>
                      <div style={{
                        width: '22px', height: '22px', borderRadius: '50%', background: '#fff',
                        position: 'absolute', top: '3px',
                        left: settings[item.key as keyof typeof settings] ? '23px' : '3px',
                        transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Account section */}
          <div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>⚙️ Account</div>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '2px' }}>Email</div>
                <div style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>{currentUser?.email}</div>
              </div>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '2px' }}>Member Since</div>
                <div style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>{new Date(currentUser?.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
              </div>
              <div style={{ padding: '14px 16px' }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '2px' }}>Account Type</div>
                <div style={{ color: '#667eea', fontSize: '14px', fontWeight: '700' }}>⭐ Free Trader</div>
              </div>
            </div>
          </div>

          {/* Save button */}
          <button onClick={handleSaveSettings} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none', borderRadius: '14px', color: '#fff', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>
            💾 Save Settings
          </button>

          {/* Danger zone */}
          <div>
            <div style={{ color: 'rgba(255,59,48,0.7)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>⚠️ Danger Zone</div>
            <button onClick={handleLogout} style={{ width: '100%', padding: '14px', background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.25)', borderRadius: '14px', color: '#ff3b30', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
              🚪 Sign Out
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── MAIN PROFILE SCREEN ───────────────────────────────────────────
  return (
    <div style={{ paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px' }}>
        <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: '800', margin: 0 }}>Profile</h2>
        <button onClick={() => setScreen('settings')} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: '38px', height: '38px', color: '#fff', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚙️</button>
      </div>

      {/* Profile Card */}
      <div style={{ padding: '0 16px 20px' }}>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Avatar + info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{ position: 'relative' }}>
              <img
                src={avatarUrl || profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.id}`}
                style={{ width: '76px', height: '76px', borderRadius: '50%', border: '3px solid #667eea', background: '#333', objectFit: 'cover' }}
                alt=""
              />
              <div style={{ position: 'absolute', bottom: '0', right: '0', background: '#667eea', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }} onClick={() => setScreen('edit')}>✏️</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#fff', fontSize: '20px', fontWeight: '800' }}>{profile?.full_name || fullName || 'Trader'}</span>
                {userVerified && (
                  <span title={isOwner ? 'Owner — Verified' : 'Verified — 1M+ followers'} style={{ fontSize: '18px', lineHeight: 1 }}>
                    {isOwner ? '🏅' : '✅'}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>@{profile?.username || username || 'user'}</span>
                {userVerified && <span style={{ color: isOwner ? '#f59e0b' : '#38bdf8', fontSize: '11px', fontWeight: '700', background: isOwner ? 'rgba(245,158,11,0.15)' : 'rgba(56,189,248,0.15)', padding: '1px 6px', borderRadius: '999px', border: `1px solid ${isOwner ? 'rgba(245,158,11,0.3)' : 'rgba(56,189,248,0.3)'}` }}>{isOwner ? '★ Owner' : '✓ Verified'}</span>}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginTop: '2px' }}>{currentUser?.email}</div>
            </div>
          </div>

          {/* Bio */}
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px', minHeight: '44px', cursor: 'pointer' }} onClick={() => setScreen('edit')}>
            <p style={{ color: profile?.bio || bio ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)', fontSize: '14px', margin: 0, lineHeight: '1.5', fontStyle: profile?.bio || bio ? 'normal' : 'italic' }}>
              {profile?.bio || bio || 'Tap to add a bio...'}
            </p>
          </div>

          {/* Website */}
          {(profile?.website || website) && (
            <div style={{ marginBottom: '14px' }}>
              <span style={{ color: '#667eea', fontSize: '13px' }}>🔗 {profile?.website || website}</span>
            </div>
          )}

          {/* Stats */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            {[
              { label: 'Posts', value: posts.length },
              { label: 'Followers', value: profile?.followers || 0 },
              { label: 'Following', value: profile?.following || 0 }
            ].map(s => (
              <div key={s.label} style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '10px 6px' }}>
                <div style={{ color: '#fff', fontSize: '20px', fontWeight: '800' }}>{s.value}</div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Verification status card */}
          {userVerified ? (
            <div style={{ background: isOwner ? 'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(251,191,36,0.08))' : 'linear-gradient(135deg,rgba(56,189,248,0.15),rgba(59,130,246,0.08))', border: `1px solid ${isOwner ? 'rgba(245,158,11,0.3)' : 'rgba(56,189,248,0.3)'}`, borderRadius: '12px', padding: '12px 14px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '22px' }}>{isOwner ? '🏅' : '✅'}</span>
              <div>
                <div style={{ color: isOwner ? '#f59e0b' : '#38bdf8', fontSize: '13px', fontWeight: '700' }}>{isOwner ? 'Owner — Always Verified' : 'Verified Account'}</div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px' }}>{isOwner ? 'You built SocioTrade 🚀' : 'You have 1M+ followers!'}</div>
              </div>
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 14px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '700' }}>🏆 Path to Verification</span>
                <span style={{ color: '#38bdf8', fontSize: '11px', fontWeight: '700' }}>✅ at 1M followers</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg,#667eea,#764ba2)', width: `${Math.min(((profile?.followers || 0) / 1_000_000) * 100, 100)}%`, transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', marginTop: '4px' }}>
                {(profile?.followers || 0).toLocaleString()} / 1,000,000 followers — {(1_000_000 - (profile?.followers || 0)).toLocaleString()} to go!
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setScreen('edit')} style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              ✏️ Edit Profile
            </button>
            <button onClick={() => setScreen('settings')} style={{ flex: 1, padding: '11px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
              ⚙️ Settings
            </button>
          </div>
        </div>
      </div>

      {/* Posts grid */}
      <div style={{ padding: '0 16px' }}>
        <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>📝 My Posts ({posts.length})</h3>
        {loading ? (
          <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '30px' }}>Loading...</div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.35)' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📝</div>
            <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '6px' }}>No posts yet</div>
            <div style={{ fontSize: '13px' }}>Go create your first post!</div>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '14px', padding: '14px', marginBottom: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              {post.post_type === 'signal' && (
                <span style={{ background: 'rgba(102,126,234,0.2)', color: '#667eea', fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '20px', marginBottom: '8px', display: 'inline-block' }}>📊 SIGNAL</span>
              )}
              {post.post_type === 'reel' && (
                <span style={{ background: 'rgba(255,149,0,0.15)', color: '#ff9500', fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '20px', marginBottom: '8px', display: 'inline-block' }}>🎬 REEL</span>
              )}
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', margin: 0, lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{post.content}</p>
              <div style={{ display: 'flex', gap: '14px', marginTop: '10px' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>❤️ {post.likes || 0}</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>💬 {post.comments || 0}</span>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginLeft: 'auto' }}>{new Date(post.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

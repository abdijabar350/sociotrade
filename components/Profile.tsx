import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../utils/supabase'
import { isVerified } from '../utils/verified'

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
  const [profileData, setProfileData] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit profile fields
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarPreview, setAvatarPreview] = useState('')
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

  const isOwner = currentUser?.email === 'abdijabarmuhammad7@gmail.com' ||
    (profileData?.username || currentUser?.profile?.username) === 'abdijabar350'
  const userVerified = isVerified({
    email: currentUser?.email,
    username: profileData?.username || currentUser?.profile?.username || '',
    followers: profileData?.followers || 0
  })

  // Load profile from Supabase (fresh) + posts
  useEffect(() => {
    if (!currentUser?.id) return

    const local = currentUser?.profile || {}
    setFullName(local.full_name || '')
    setUsername(local.username || '')
    setBio(local.bio || '')
    setAvatarPreview(local.avatar_url || '')
    setWebsite(local.website || '')
    setProfileData(local)

    // Fetch fresh profile from Supabase
    supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfileData(data)
          setFullName(data.full_name || '')
          setUsername(data.username || '')
          setBio(data.bio || '')
          setAvatarPreview(data.avatar_url || '')
          setWebsite(data.website || '')
          // Update localStorage cache
          const stored = JSON.parse(localStorage.getItem('sociotrade_user') || '{}')
          if (stored.id === currentUser.id) {
            stored.profile = data
            localStorage.setItem('sociotrade_user', JSON.stringify(stored))
          }
        }
      })
      .catch(() => {})

    // Load settings
    const savedSettings = localStorage.getItem('sociotrade_settings')
    if (savedSettings) {
      try { setSettings(JSON.parse(savedSettings)) } catch {}
    }

    // Load posts
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
        const local = JSON.parse(localStorage.getItem('sociotrade_posts') || '[]')
        setPosts(local.filter((p: any) => p.user_id === currentUser.id))
        setLoading(false)
      })
  }, [currentUser])

  // ─── PHOTO UPLOAD ────────────────────────────────────────────────
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string
      // Resize to max 300x300 for storage efficiency
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const max = 300
        let w = img.width, h = img.height
        if (w > h) { h = Math.round(h * max / w); w = max }
        else { w = Math.round(w * max / h); h = max }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        const resized = canvas.toDataURL('image/jpeg', 0.82)
        setAvatarPreview(resized)
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  // ─── SAVE PROFILE ────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    setSaving(true)
    const updates: any = {
      full_name: fullName.trim(),
      username: username.trim().replace(/^@/, ''),
      bio: bio.trim(),
      avatar_url: avatarPreview,
      website: website.trim(),
      updated_at: new Date().toISOString()
    }

    try {
      const { error } = await supabase.from('profiles').update(updates).eq('id', currentUser.id)
      if (error) throw error
    } catch (err) {
      // Supabase failed — save locally only
      console.warn('Profile save to Supabase failed:', err)
    }

    // Always update localStorage
    const stored = JSON.parse(localStorage.getItem('sociotrade_user') || '{}')
    if (stored.id === currentUser.id) {
      stored.profile = { ...stored.profile, ...updates }
      localStorage.setItem('sociotrade_user', JSON.stringify(stored))
    }
    setProfileData((prev: any) => ({ ...prev, ...updates }))

    setSaving(false)
    setSaveMsg('✅ Profile saved!')
    setTimeout(() => { setSaveMsg(''); setScreen('profile') }, 1200)
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
    if (confirm('Are you sure you want to sign out?')) onLogout()
  }

  const displayAvatar = avatarPreview || profileData?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.id}`
  const displayName = profileData?.full_name || fullName || 'Trader'
  const displayUsername = profileData?.username || username || 'user'

  // ─── EDIT PROFILE ────────────────────────────────────────────────
  if (screen === 'edit') {
    return (
      <div style={{ paddingBottom: '80px', minHeight: '100vh', background: '#0a0a0f' }}>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handlePhotoSelect}
        />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 10 }}>
          <button onClick={() => setScreen('profile')} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: '#fff', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: '800', margin: 0, flex: 1 }}>Edit Profile</h2>
          <button onClick={handleSaveProfile} disabled={saving} style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none', borderRadius: '20px', padding: '8px 18px', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {saveMsg && (
          <div style={{ margin: '12px 16px', padding: '10px 16px', background: 'rgba(52,199,89,0.15)', border: '1px solid rgba(52,199,89,0.3)', borderRadius: '10px', color: '#34c759', fontSize: '14px', fontWeight: '600' }}>{saveMsg}</div>
        )}

        {/* Avatar Upload Section */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 16px 20px' }}>
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <img
              src={displayAvatar}
              style={{ width: '100px', height: '100px', borderRadius: '50%', border: '3px solid #667eea', background: '#1a1a2e', objectFit: 'cover', display: 'block' }}
              alt="Profile"
            />
            {/* Camera button overlay */}
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ position: 'absolute', bottom: '2px', right: '2px', background: 'linear-gradient(135deg,#667eea,#764ba2)', border: '2px solid #0a0a0f', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '15px' }}
              title="Change photo"
            >📷</button>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{ background: 'rgba(102,126,234,0.15)', border: '1px solid rgba(102,126,234,0.35)', borderRadius: '20px', padding: '8px 20px', color: '#667eea', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
          >
            📷 Change Profile Photo
          </button>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: '8px 0 0', textAlign: 'center' }}>Tap to upload from camera roll</p>
        </div>

        {/* Form Fields */}
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { label: 'Full Name', value: fullName, set: setFullName, placeholder: 'Your display name', icon: '👤', type: 'text' },
            { label: 'Username', value: username, set: setUsername, placeholder: '@username', icon: '🏷️', type: 'text' },
            { label: 'Website', value: website, set: setWebsite, placeholder: 'https://yoursite.com', icon: '🔗', type: 'url' },
          ].map(field => (
            <div key={field.label}>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: '700', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                {field.icon} {field.label}
              </label>
              <input
                value={field.value}
                onChange={e => field.set(e.target.value)}
                placeholder={field.placeholder}
                type={field.type}
                style={{ width: '100%', padding: '13px 15px', background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 0.2s' }}
                onFocus={e => { e.target.style.borderColor = '#667eea' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)' }}
              />
            </div>
          ))}

          {/* Bio */}
          <div>
            <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: '700', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              📝 Bio
            </label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell the world about yourself — your trading style, strategy, goals..."
              maxLength={160}
              rows={4}
              style={{ width: '100%', padding: '13px 15px', background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical', lineHeight: '1.5', transition: 'border-color 0.2s' }}
              onFocus={e => { e.target.style.borderColor = '#667eea' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)' }}
            />
            <div style={{ color: bio.length >= 140 ? '#ff6b6b' : 'rgba(255,255,255,0.35)', fontSize: '11px', textAlign: 'right', marginTop: '4px', fontWeight: bio.length >= 140 ? '700' : '400' }}>
              {bio.length}/160
            </div>
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={saving}
            style={{ width: '100%', padding: '15px', background: saving ? 'rgba(102,126,234,0.5)' : 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none', borderRadius: '14px', color: '#fff', fontSize: '16px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', marginTop: '4px', boxShadow: '0 4px 20px rgba(102,126,234,0.3)' }}
          >
            {saving ? '⏳ Saving...' : '💾 Save Profile'}
          </button>
        </div>
      </div>
    )
  }

  // ─── SETTINGS ────────────────────────────────────────────────────
  if (screen === 'settings') {
    const settingGroups = [
      {
        title: '🔔 Notifications',
        items: [
          { key: 'pushNotifications', label: 'Push Notifications', desc: 'Likes, follows, and comments' },
          { key: 'emailAlerts', label: 'Email Alerts', desc: 'Weekly digest emails' },
          { key: 'tradeAlerts', label: 'Trade Alerts', desc: 'Price alerts on your watchlist' },
          { key: 'signalAlerts', label: 'Signal Alerts', desc: 'When someone posts a signal' },
        ]
      },
      {
        title: '🔒 Privacy',
        items: [
          { key: 'privateAccount', label: 'Private Account', desc: 'Only approved followers see posts' },
          { key: 'showPortfolio', label: 'Show Portfolio Value', desc: 'Others can see your portfolio total' },
          { key: 'showOnLeaderboard', label: 'Show on Leaderboard', desc: 'Appear in top trader rankings' },
        ]
      },
      {
        title: '🎨 Appearance',
        items: [
          { key: 'darkMode', label: 'Dark Mode', desc: 'Dark theme (recommended)' },
          { key: 'compactFeed', label: 'Compact Feed', desc: 'Show more posts per screen' },
          { key: 'soundEffects', label: 'Sound Effects', desc: 'Play sounds on trades' },
        ]
      }
    ]

    return (
      <div style={{ paddingBottom: '80px', background: '#0a0a0f', minHeight: '100vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 10 }}>
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
                  <div key={item.key} onClick={() => toggleSetting(item.key as keyof typeof settings)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer', borderBottom: i < group.items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', WebkitTapHighlightColor: 'transparent' }}>
                    <div>
                      <div style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>{item.label}</div>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '2px' }}>{item.desc}</div>
                    </div>
                    <div style={{ width: '48px', height: '28px', borderRadius: '14px', position: 'relative', background: settings[item.key as keyof typeof settings] ? 'linear-gradient(135deg,#667eea,#764ba2)' : 'rgba(255,255,255,0.12)', transition: 'background 0.25s', flexShrink: 0 }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: settings[item.key as keyof typeof settings] ? '23px' : '3px', transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Account info */}
          <div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>⚙️ Account</div>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', marginBottom: '2px' }}>Email</div>
                <div style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>{currentUser?.email}</div>
              </div>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', marginBottom: '2px' }}>Member Since</div>
                <div style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>{new Date(currentUser?.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
              </div>
              <div style={{ padding: '14px 16px' }}>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', marginBottom: '2px' }}>Account Type</div>
                <div style={{ color: '#667eea', fontSize: '14px', fontWeight: '700' }}>⭐ Free Trader</div>
              </div>
            </div>
          </div>

          <button onClick={handleSaveSettings} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none', borderRadius: '14px', color: '#fff', fontSize: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 20px rgba(102,126,234,0.3)' }}>
            💾 Save Settings
          </button>

          <div>
            <div style={{ color: 'rgba(255,59,48,0.7)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>⚠️ Danger Zone</div>
            <button onClick={handleLogout} style={{ width: '100%', padding: '14px', background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.25)', borderRadius: '14px', color: '#ff3b30', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
              🚪 Sign Out
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── MAIN PROFILE ────────────────────────────────────────────────
  return (
    <div style={{ paddingBottom: '80px', background: '#0a0a0f', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px' }}>
        <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: '800', margin: 0 }}>My Profile</h2>
        <button onClick={() => setScreen('settings')} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: '38px', height: '38px', color: '#fff', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚙️</button>
      </div>

      <div style={{ padding: '0 16px 20px' }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '20px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Avatar + name row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setScreen('edit')}>
              <img
                src={displayAvatar}
                style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid #667eea', background: '#1a1a2e', objectFit: 'cover', display: 'block' }}
                alt="avatar"
              />
              <div style={{ position: 'absolute', bottom: '0', right: '0', background: 'linear-gradient(135deg,#667eea,#764ba2)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', border: '2px solid #0a0a0f' }}>✏️</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ color: '#fff', fontSize: '19px', fontWeight: '800' }}>{displayName}</span>
                {userVerified && <span style={{ fontSize: '18px' }}>{isOwner ? '🏅' : '✅'}</span>}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', marginTop: '2px' }}>@{displayUsername}</div>
              {isOwner && <span style={{ color: '#f59e0b', fontSize: '11px', fontWeight: '700', background: 'rgba(245,158,11,0.15)', padding: '2px 8px', borderRadius: '999px', border: '1px solid rgba(245,158,11,0.3)', marginTop: '4px', display: 'inline-block' }}>★ Owner</span>}
            </div>
          </div>

          {/* Bio */}
          <div
            onClick={() => setScreen('edit')}
            style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px', cursor: 'pointer', minHeight: '44px' }}
          >
            <p style={{ color: profileData?.bio ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)', fontSize: '14px', margin: 0, lineHeight: '1.6', fontStyle: profileData?.bio ? 'normal' : 'italic' }}>
              {profileData?.bio || 'Tap to add a bio...'}
            </p>
          </div>

          {/* Website */}
          {profileData?.website && (
            <div style={{ marginBottom: '14px' }}>
              <a href={profileData.website} target="_blank" rel="noopener noreferrer" style={{ color: '#667eea', fontSize: '13px', textDecoration: 'none' }}>🔗 {profileData.website}</a>
            </div>
          )}

          {/* Stats */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            {[
              { label: 'Posts', value: posts.length },
              { label: 'Followers', value: profileData?.followers || 0 },
              { label: 'Following', value: profileData?.following || 0 }
            ].map(s => (
              <div key={s.label} style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '10px 6px' }}>
                <div style={{ color: '#fff', fontSize: '20px', fontWeight: '800' }}>{s.value.toLocaleString()}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Verification card */}
          {userVerified ? (
            <div style={{ background: isOwner ? 'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(251,191,36,0.08))' : 'linear-gradient(135deg,rgba(56,189,248,0.15),rgba(59,130,246,0.08))', border: `1px solid ${isOwner ? 'rgba(245,158,11,0.3)' : 'rgba(56,189,248,0.3)'}`, borderRadius: '12px', padding: '12px 14px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>{isOwner ? '🏅' : '✅'}</span>
              <div>
                <div style={{ color: isOwner ? '#f59e0b' : '#38bdf8', fontSize: '13px', fontWeight: '700' }}>{isOwner ? 'Owner — Always Verified' : 'Verified Account'}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{isOwner ? 'You built SocioTrade 🚀' : 'You have 1M+ followers!'}</div>
              </div>
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '12px 14px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '700' }}>🏆 Path to Verification</span>
                <span style={{ color: '#38bdf8', fontSize: '11px', fontWeight: '700' }}>✅ at 1M followers</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg,#667eea,#764ba2)', width: `${Math.min(((profileData?.followers || 0) / 1_000_000) * 100, 100)}%` }} />
              </div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', marginTop: '5px' }}>
                {(profileData?.followers || 0).toLocaleString()} / 1,000,000 followers
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setScreen('edit')} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 15px rgba(102,126,234,0.3)' }}>
              ✏️ Edit Profile
            </button>
            <button onClick={() => setScreen('settings')} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
              ⚙️ Settings
            </button>
          </div>
        </div>
      </div>

      {/* My Posts */}
      <div style={{ padding: '0 16px' }}>
        <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>📝 My Posts ({posts.length})</h3>
        {loading ? (
          <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '40px', fontSize: '14px' }}>Loading posts...</div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.35)' }}>
            <div style={{ fontSize: '44px', marginBottom: '12px' }}>📝</div>
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '6px', color: 'rgba(255,255,255,0.6)' }}>No posts yet</div>
            <div style={{ fontSize: '13px' }}>Tap ✚ to create your first post!</div>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '14px', padding: '14px', marginBottom: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              {(post.type === 'signal' || post.post_type === 'signal') && (
                <span style={{ background: 'rgba(102,126,234,0.2)', color: '#667eea', fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', marginBottom: '8px', display: 'inline-block' }}>📊 SIGNAL</span>
              )}
              {(post.type === 'reel' || post.post_type === 'reel') && (
                <span style={{ background: 'rgba(255,149,0,0.15)', color: '#ff9500', fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', marginBottom: '8px', display: 'inline-block' }}>🎬 REEL</span>
              )}
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', margin: 0, lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{post.content}</p>
              <div style={{ display: 'flex', gap: '14px', marginTop: '10px', alignItems: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>❤️ {post.likes || 0}</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>💬 {post.comments || 0}</span>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginLeft: 'auto' }}>{new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

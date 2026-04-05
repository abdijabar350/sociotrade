import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'

interface ProfileProps {
  currentUser: any
  onLogout: () => void
}

export default function Profile({ currentUser, onLogout }: ProfileProps) {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)

  const profile = currentUser?.profile

  useEffect(() => {
    if (!currentUser?.id) return
    setBio(profile?.bio || '')
    supabase
      .from('posts')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPosts(data || [])
        setLoading(false)
      })
  }, [currentUser])

  const handleSaveBio = async () => {
    setSaving(true)
    await supabase.from('profiles').update({ bio }).eq('id', currentUser.id)
    setSaving(false)
    setEditMode(false)
  }

  const handleLogout = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      onLogout()
    }
  }

  return (
    <div style={{ paddingBottom: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px' }}>
        <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: '800', margin: 0 }}>Profile</h2>
        <button onClick={handleLogout} style={{
          background: 'rgba(255,59,48,0.15)', border: '1px solid rgba(255,59,48,0.3)',
          borderRadius: '20px', padding: '8px 16px', color: '#ff3b30',
          fontSize: '13px', fontWeight: '600', cursor: 'pointer'
        }}>Sign Out</button>
      </div>

      {/* Profile card */}
      <div style={{ padding: '0 16px 20px' }}>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <img
              src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.id}`}
              style={{ width: '72px', height: '72px', borderRadius: '50%', border: '3px solid #667eea', background: '#333' }}
              alt=""
            />
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontSize: '20px', fontWeight: '800' }}>{profile?.full_name || 'Trader'}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>@{profile?.username || 'user'}</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '4px' }}>{currentUser?.email}</div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            {[
              { label: 'Posts', value: posts.length },
              { label: 'Followers', value: profile?.followers || 0 },
              { label: 'Following', value: profile?.following || 0 }
            ].map(s => (
              <div key={s.label} style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '10px' }}>
                <div style={{ color: '#fff', fontSize: '20px', fontWeight: '800' }}>{s.value}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Bio */}
          {editMode ? (
            <div>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Write a bio..."
                style={{
                  width: '100%', padding: '12px', background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px',
                  color: '#fff', fontSize: '14px', outline: 'none',
                  resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', minHeight: '80px'
                }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button onClick={handleSaveBio} disabled={saving} style={{
                  flex: 1, padding: '10px', background: 'linear-gradient(135deg,#667eea,#764ba2)',
                  border: 'none', borderRadius: '10px', color: '#fff', fontWeight: '700', cursor: 'pointer'
                }}>{saving ? 'Saving...' : 'Save'}</button>
                <button onClick={() => setEditMode(false)} style={{
                  flex: 1, padding: '10px', background: 'rgba(255,255,255,0.07)',
                  border: 'none', borderRadius: '10px', color: '#fff', fontWeight: '600', cursor: 'pointer'
                }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', margin: '0 0 12px' }}>
                {profile?.bio || 'No bio yet...'}
              </p>
              <button onClick={() => setEditMode(true)} style={{
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px', padding: '8px 20px', color: '#fff',
                fontSize: '13px', fontWeight: '600', cursor: 'pointer'
              }}>✏️ Edit Profile</button>
            </div>
          )}
        </div>
      </div>

      {/* Posts grid */}
      <div style={{ padding: '0 16px' }}>
        <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>My Posts ({posts.length})</h3>
        {loading ? (
          <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '20px' }}>Loading...</div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.4)' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>📝</div>
            No posts yet — go create one!
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} style={{
              background: 'rgba(255,255,255,0.04)', borderRadius: '14px',
              padding: '14px', marginBottom: '10px',
              border: '1px solid rgba(255,255,255,0.06)'
            }}>
              {post.post_type === 'signal' && (
                <span style={{ background: 'rgba(102,126,234,0.2)', color: '#667eea', fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '20px', marginBottom: '8px', display: 'inline-block' }}>📊 SIGNAL</span>
              )}
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', margin: 0, lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{post.content}</p>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>❤️ {post.likes}</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>💬 {post.comments}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

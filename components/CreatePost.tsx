import React, { useState } from 'react'
import { X, Image, Video, TrendingUp, Camera, ChevronDown, ChevronUp } from 'lucide-react'

type PostType = 'post' | 'story' | 'reel' | 'signal'

interface CreatePostProps {
  currentUser: any
  onClose: () => void
  onPost: () => void
}

export default function CreatePost({ currentUser, onClose, onPost }: CreatePostProps) {
  const [postType, setPostType] = useState<PostType>('post')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Signal fields
  const [ticker, setTicker] = useState('')
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG')
  const [entry, setEntry] = useState('')
  const [target, setTarget] = useState('')
  const [stopLoss, setStopLoss] = useState('')
  const [confidence, setConfidence] = useState(75)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const profile = currentUser?.profile || {}
  const username = profile.username || currentUser?.email?.split('@')[0] || 'user'
  const fullName = profile.full_name || username
  const avatarUrl = profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
  const userId = currentUser?.id || 'local'

  const postTypes: { type: PostType; icon: string; label: string }[] = [
    { type: 'post', icon: '📝', label: 'Post' },
    { type: 'story', icon: '⭕', label: 'Story' },
    { type: 'reel', icon: '🎬', label: 'Reel' },
    { type: 'signal', icon: '📊', label: 'Signal' },
  ]

  const savePost = (post: any) => {
    const existing: any[] = JSON.parse(localStorage.getItem('st_posts') || '[]')
    localStorage.setItem('st_posts', JSON.stringify([post, ...existing]))
  }

  const saveStory = (story: any) => {
    const existing: any[] = JSON.parse(localStorage.getItem('st_stories') || '[]')
    const filtered = existing.filter((s: any) => Date.now() - new Date(s.created_at).getTime() < 24 * 60 * 60 * 1000)
    localStorage.setItem('st_stories', JSON.stringify([story, ...filtered]))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    if (postType === 'signal' && !ticker.trim()) {
      setError('Please enter a ticker symbol')
      setLoading(false)
      return
    }
    if (postType !== 'signal' && !content.trim() && !imageUrl.trim() && !videoUrl.trim()) {
      setError('Please add some content')
      setLoading(false)
      return
    }

    const now = new Date().toISOString()
    const postId = `post_${Date.now()}_${Math.random().toString(36).slice(2)}`

    const postData: any = {
      id: postId,
      user_id: userId,
      username,
      full_name: fullName,
      avatar_url: avatarUrl,
      content: content.trim(),
      image_url: imageUrl.trim() || null,
      video_url: videoUrl.trim() || null,
      post_type: postType,
      likes: 0,
      comments: 0,
      liked: false,
      created_at: now,
    }

    if (postType === 'signal') {
      postData.ticker = ticker.toUpperCase().trim()
      postData.signal_direction = direction
      postData.entry_price = entry
      postData.target_price = target
      postData.stop_loss = stopLoss
      postData.confidence = confidence
    }

    if (postType === 'story') {
      const story = {
        id: postId,
        user_id: userId,
        username,
        full_name: fullName,
        avatar_url: avatarUrl,
        image_url: imageUrl.trim() || null,
        content: content.trim(),
        created_at: now
      }
      saveStory(story)
    } else {
      savePost(postData)
    }

    // Also try to save to Supabase in background
    try {
      const { supabase } = await import('../utils/supabase')
      if (postType === 'story') {
        await supabase.from('stories').insert({
          user_id: userId, username, full_name: fullName,
          avatar_url: avatarUrl, image_url: imageUrl.trim() || null,
          content: content.trim()
        })
      } else {
        await supabase.from('posts').insert(postData)
      }
    } catch {}

    setLoading(false)
    onPost()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px', color: '#fff',
    fontSize: '14px', outline: 'none',
    boxSizing: 'border-box'
  }

  const labelStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.6)', fontSize: '12px',
    fontWeight: '600', display: 'block', marginBottom: '5px'
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'flex-end'
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: '100%', maxWidth: '430px', margin: '0 auto',
        background: '#1a1a2e', borderRadius: '24px 24px 0 0',
        padding: '24px 20px 40px', maxHeight: '92vh', overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: '700', margin: 0 }}>Create</h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={18} color="#fff" />
          </button>
        </div>

        {/* Post Type Selector */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {postTypes.map(({ type, icon, label }) => (
            <button key={type} onClick={() => setPostType(type)} style={{
              flex: 1, padding: '10px 4px',
              background: postType === type ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'rgba(255,255,255,0.07)',
              border: postType === type ? 'none' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px', color: '#fff',
              fontSize: '11px', fontWeight: '600',
              cursor: 'pointer', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '4px'
            }}>
              <span style={{ fontSize: '18px' }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {/* User info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <img src={avatarUrl} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
          <div>
            <div style={{ color: '#fff', fontWeight: '600', fontSize: '14px' }}>{fullName}</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>@{username}</div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(255,59,48,0.15)', border: '1px solid rgba(255,59,48,0.3)',
            borderRadius: '10px', padding: '10px 14px',
            color: '#ff3b30', fontSize: '13px', marginBottom: '14px'
          }}>{error}</div>
        )}

        {/* SIGNAL form */}
        {postType === 'signal' && (
          <div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Ticker Symbol *</label>
                <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())}
                  placeholder="BTC, ETH, AAPL..." style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Direction</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['LONG', 'SHORT'] as const).map(d => (
                    <button key={d} onClick={() => setDirection(d)} style={{
                      flex: 1, padding: '12px 8px',
                      background: direction === d
                        ? d === 'LONG' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'
                        : 'rgba(255,255,255,0.07)',
                      border: direction === d
                        ? d === 'LONG' ? '1px solid #22c55e' : '1px solid #ef4444'
                        : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      color: direction === d ? (d === 'LONG' ? '#22c55e' : '#ef4444') : 'rgba(255,255,255,0.6)',
                      fontSize: '13px', fontWeight: '700', cursor: 'pointer'
                    }}>{d}</button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Analysis / Reason</label>
              <textarea value={content} onChange={e => setContent(e.target.value)}
                placeholder="Why this trade? What's your analysis..." rows={3}
                style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit' }} />
            </div>

            <button onClick={() => setShowAdvanced(!showAdvanced)} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'none', border: 'none', color: '#667eea',
              fontSize: '13px', fontWeight: '600', cursor: 'pointer',
              marginBottom: '14px', padding: 0
            }}>
              {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {showAdvanced ? 'Hide' : 'Add'} Price Levels
            </button>

            {showAdvanced && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                {[
                  { label: 'Entry Price', val: entry, set: setEntry, ph: '45000' },
                  { label: 'Target Price', val: target, set: setTarget, ph: '55000' },
                  { label: 'Stop Loss', val: stopLoss, set: setStopLoss, ph: '42000' },
                ].map(f => (
                  <div key={f.label} style={{ gridColumn: f.label === 'Stop Loss' ? 'span 2' : 'span 1' }}>
                    <label style={labelStyle}>{f.label}</label>
                    <input value={f.val} onChange={e => f.set(e.target.value)}
                      placeholder={f.ph} style={inputStyle} />
                  </div>
                ))}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Confidence: {confidence}%</label>
                  <input type="range" min={1} max={100} value={confidence}
                    onChange={e => setConfidence(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#667eea' }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* STORY form */}
        {postType === 'story' && (
          <div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Story Image URL *</label>
              <input value={imageUrl} onChange={e => setImageUrl(e.target.value)}
                placeholder="https://..." style={inputStyle} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Caption (optional)</label>
              <textarea value={content} onChange={e => setContent(e.target.value)}
                placeholder="Add a caption..." rows={2}
                style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit' }} />
            </div>
            {imageUrl && (
              <img src={imageUrl} alt="Preview" onError={() => {}}
                style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '12px', marginBottom: '14px' }} />
            )}
            <div style={{
              background: 'rgba(102,126,234,0.1)', border: '1px solid rgba(102,126,234,0.3)',
              borderRadius: '10px', padding: '10px 14px', fontSize: '12px',
              color: 'rgba(255,255,255,0.6)', marginBottom: '14px'
            }}>
              ⭕ Stories appear in the bar at the top and expire after 24 hours
            </div>
          </div>
        )}

        {/* REEL form */}
        {postType === 'reel' && (
          <div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Video URL</label>
              <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
                placeholder="YouTube, MP4, or any video link..." style={inputStyle} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Caption</label>
              <textarea value={content} onChange={e => setContent(e.target.value)}
                placeholder="Describe your reel..." rows={2}
                style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit' }} />
            </div>
            <div style={{
              background: 'rgba(102,126,234,0.1)', border: '1px solid rgba(102,126,234,0.3)',
              borderRadius: '10px', padding: '10px 14px', fontSize: '12px',
              color: 'rgba(255,255,255,0.6)', marginBottom: '14px'
            }}>
              🎬 Supports YouTube links (auto-embed), MP4, or any video URL
            </div>
          </div>
        )}

        {/* POST form */}
        {postType === 'post' && (
          <div>
            <div style={{ marginBottom: '14px' }}>
              <textarea value={content} onChange={e => setContent(e.target.value)}
                placeholder="What's on your mind? Share a trade insight, market update..." rows={4}
                style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit', fontSize: '15px' }} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Image URL (optional)</label>
              <input value={imageUrl} onChange={e => setImageUrl(e.target.value)}
                placeholder="https://..." style={inputStyle} />
            </div>
            {imageUrl && (
              <img src={imageUrl} alt="Preview" onError={() => {}}
                style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '12px', marginBottom: '14px' }} />
            )}
          </div>
        )}

        {/* Submit */}
        <button onClick={handleSubmit} disabled={loading} style={{
          width: '100%', padding: '16px',
          background: loading ? 'rgba(102,126,234,0.5)' : 'linear-gradient(135deg, #667eea, #764ba2)',
          border: 'none', borderRadius: '14px',
          color: '#fff', fontSize: '16px', fontWeight: '700',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}>
          {loading ? '⏳ Posting...' : postType === 'story' ? '⭕ Share Story' : postType === 'reel' ? '🎬 Share Reel' : postType === 'signal' ? '📊 Share Signal' : '📝 Share Post'}
        </button>
      </div>
    </div>
  )
}

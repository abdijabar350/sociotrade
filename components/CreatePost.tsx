import React, { useState } from 'react'
import { supabase } from '../utils/supabase'

interface CreatePostProps {
  currentUser: any
  onClose: () => void
  onPost: () => void
}

export default function CreatePost({ currentUser, onClose, onPost }: CreatePostProps) {
  const [postType, setPostType] = useState<'post' | 'reel' | 'story' | 'signal'>('post')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(false)

  // Trade signal fields
  const [ticker, setTicker] = useState('')
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG')
  const [entry, setEntry] = useState('')
  const [target, setTarget] = useState('')
  const [stopLoss, setStopLoss] = useState('')
  const [confidence, setConfidence] = useState('75')

  const profile = currentUser?.profile

  const handleSubmit = async () => {
    if (postType === 'signal' && !ticker.trim()) {
      setError('Please enter a ticker symbol!')
      return
    }
    if (postType === 'story' && !imageUrl.trim() && !content.trim()) {
      setError('Add an image URL or caption for your story!')
      return
    }
    if (postType === 'reel' && !content.trim() && !videoUrl.trim()) {
      setError('Add a video URL or description for your reel!')
      return
    }
    if (postType === 'post' && !content.trim()) {
      setError('Please write something!')
      return
    }

    setLoading(true)
    setError('')

    let postContent = content
    if (postType === 'signal') {
      postContent = content || `🚨 ${direction} Signal on $${ticker.toUpperCase()}`
    }

    const insertData: any = {
      user_id: currentUser.id,
      username: profile?.username || currentUser.email?.split('@')[0],
      full_name: profile?.full_name || 'Trader',
      avatar_url: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.id}`,
      content: postContent,
      image_url: imageUrl || null,
      post_type: postType,
      likes: 0,
      comments: 0
    }

    if (postType === 'reel') insertData.video_url = videoUrl || null
    if (postType === 'signal') {
      insertData.ticker = ticker.toUpperCase()
      insertData.signal_direction = direction
      insertData.entry_price = entry || null
      insertData.target_price = target || null
      insertData.stop_loss = stopLoss || null
      insertData.confidence = parseInt(confidence) || 75
    }

    const { error: insertError } = await supabase.from('posts').insert(insertData)

    if (insertError) {
      setError('Failed to post. Please try again.')
      setLoading(false)
      return
    }

    setLoading(false)
    onPost()
  }

  const types = [
    { key: 'post', label: '📝', name: 'Post', color: '#667eea' },
    { key: 'story', label: '⭕', name: 'Story', color: '#ff6b6b' },
    { key: 'reel', label: '🎬', name: 'Reel', color: '#ff9500' },
    { key: 'signal', label: '📊', name: 'Signal', color: '#30d158' },
  ] as const

  const activeColor = types.find(t => t.key === postType)?.color || '#667eea'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'flex-end'
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: '100%', maxWidth: '430px', margin: '0 auto',
        background: '#12121f', borderRadius: '28px 28px 0 0',
        padding: '20px 20px 36px', maxHeight: '92vh', overflowY: 'auto'
      }}>

        {/* Handle bar */}
        <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', margin: '0 auto 20px' }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: '800', margin: 0 }}>Create</h2>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.1)', border: 'none',
            borderRadius: '50%', width: '36px', height: '36px',
            color: '#fff', fontSize: '20px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>×</button>
        </div>

        {/* Type selector */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '22px' }}>
          {types.map(t => (
            <button key={t.key} onClick={() => { setPostType(t.key); setError('') }} style={{
              flex: 1, padding: '12px 4px',
              background: postType === t.key ? t.color + '22' : 'rgba(255,255,255,0.05)',
              border: postType === t.key ? `1.5px solid ${t.color}` : '1.5px solid transparent',
              borderRadius: '14px', color: postType === t.key ? t.color : 'rgba(255,255,255,0.5)',
              fontSize: '11px', fontWeight: '700', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
            }}>
              <span style={{ fontSize: '20px' }}>{t.label}</span>
              {t.name}
            </button>
          ))}
        </div>

        {/* User info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <img
            src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.id}`}
            style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', background: '#333', border: `2px solid ${activeColor}` }}
            alt=""
          />
          <div>
            <div style={{ color: '#fff', fontWeight: '700', fontSize: '15px' }}>{profile?.full_name || 'Trader'}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>@{profile?.username || 'user'}</div>
          </div>
        </div>

        {/* STORY UI */}
        {postType === 'story' && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              background: 'rgba(255,107,107,0.08)', borderRadius: '16px',
              padding: '14px', marginBottom: '14px',
              border: '1px solid rgba(255,107,107,0.2)'
            }}>
              <div style={{ color: '#ff6b6b', fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>
                ⭕ Story — disappears after 24 hours
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
                Add an image URL (your story photo) and an optional caption.
              </div>
            </div>
            <input
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="📷 Paste image URL for your story"
              style={inputStyle}
            />
            {imageUrl && (
              <div style={{ marginTop: '10px', borderRadius: '16px', overflow: 'hidden', maxHeight: '200px' }}>
                <img src={imageUrl} alt="" style={{ width: '100%', height: '200px', objectFit: 'cover' }} onError={() => setImageUrl('')} />
              </div>
            )}
          </div>
        )}

        {/* REEL UI */}
        {postType === 'reel' && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              background: 'rgba(255,149,0,0.08)', borderRadius: '16px',
              padding: '14px', marginBottom: '14px',
              border: '1px solid rgba(255,149,0,0.2)'
            }}>
              <div style={{ color: '#ff9500', fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>
                🎬 Reel — short video update
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
                Paste a video URL (YouTube, MP4, etc.) or just write a video description.
              </div>
            </div>
            <input
              value={videoUrl}
              onChange={e => setVideoUrl(e.target.value)}
              placeholder="🎥 Video URL (YouTube, MP4 link...)"
              style={inputStyle}
            />
          </div>
        )}

        {/* SIGNAL UI */}
        {postType === 'signal' && (
          <div style={{
            background: 'rgba(48,209,88,0.08)', borderRadius: '16px',
            padding: '16px', marginBottom: '16px',
            border: '1px solid rgba(48,209,88,0.2)'
          }}>
            <div style={{ color: '#30d158', fontWeight: '700', fontSize: '14px', marginBottom: '14px' }}>
              📊 Trade Signal Details
            </div>

            {/* Direction toggle */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <button onClick={() => setDirection('LONG')} style={{
                flex: 1, padding: '10px',
                background: direction === 'LONG' ? '#30d15822' : 'rgba(255,255,255,0.05)',
                border: direction === 'LONG' ? '1.5px solid #30d158' : '1.5px solid transparent',
                borderRadius: '10px', color: direction === 'LONG' ? '#30d158' : 'rgba(255,255,255,0.5)',
                fontWeight: '700', fontSize: '14px', cursor: 'pointer'
              }}>📈 LONG</button>
              <button onClick={() => setDirection('SHORT')} style={{
                flex: 1, padding: '10px',
                background: direction === 'SHORT' ? '#ff3b3022' : 'rgba(255,255,255,0.05)',
                border: direction === 'SHORT' ? '1.5px solid #ff3b30' : '1.5px solid transparent',
                borderRadius: '10px', color: direction === 'SHORT' ? '#ff3b30' : 'rgba(255,255,255,0.5)',
                fontWeight: '700', fontSize: '14px', cursor: 'pointer'
              }}>📉 SHORT</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { label: 'Ticker *', value: ticker, set: setTicker, placeholder: 'BTC, AAPL...' },
                { label: `Confidence: ${confidence}%`, value: confidence, set: setConfidence, placeholder: '75' },
                { label: 'Entry Price', value: entry, set: setEntry, placeholder: '0.00' },
                { label: 'Target Price', value: target, set: setTarget, placeholder: '0.00' },
                { label: 'Stop Loss', value: stopLoss, set: setStopLoss, placeholder: '0.00' }
              ].map(f => (
                <div key={f.label}>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px' }}>{f.label}</div>
                  <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                    style={{ ...inputStyle, padding: '8px 10px', fontSize: '13px' }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Caption / Content */}
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={
            postType === 'story' ? 'Add a caption (optional)...' :
            postType === 'signal' ? '💬 Add analysis notes (optional)...' :
            postType === 'reel' ? '💬 Describe your reel...' :
            "💬 What's on your mind?"
          }
          style={{
            width: '100%', minHeight: postType === 'story' ? '60px' : '100px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '14px', color: '#fff',
            fontSize: '15px', padding: '14px',
            outline: 'none', resize: 'none',
            boxSizing: 'border-box', fontFamily: 'inherit',
            lineHeight: '1.5'
          }}
        />

        {/* Image URL for post/reel (not story — already above) */}
        {(postType === 'post' || postType === 'reel') && (
          <input
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
            placeholder="📷 Image URL (optional)"
            style={{ ...inputStyle, marginTop: '10px' }}
          />
        )}

        {/* Image preview */}
        {imageUrl && postType !== 'story' && (
          <div style={{ marginTop: '10px', borderRadius: '14px', overflow: 'hidden' }}>
            <img src={imageUrl} alt="" style={{ width: '100%', maxHeight: '180px', objectFit: 'cover' }} onError={() => {}} />
          </div>
        )}

        {error && (
          <div style={{
            color: '#ff3b30', fontSize: '13px', marginTop: '12px',
            textAlign: 'center', background: 'rgba(255,59,48,0.1)',
            padding: '10px', borderRadius: '10px'
          }}>{error}</div>
        )}

        <button onClick={handleSubmit} disabled={loading} style={{
          width: '100%', padding: '17px', marginTop: '18px',
          background: loading ? 'rgba(102,126,234,0.4)' : `linear-gradient(135deg, ${activeColor}, ${activeColor}cc)`,
          border: 'none', borderRadius: '16px',
          color: '#fff', fontSize: '16px', fontWeight: '800',
          cursor: loading ? 'not-allowed' : 'pointer',
          letterSpacing: '0.5px'
        }}>
          {loading ? '⏳ Posting...' :
            postType === 'story' ? '⭕ Share Story' :
            postType === 'reel' ? '🎬 Share Reel' :
            postType === 'signal' ? '📊 Share Signal' :
            '🚀 Share Post'}
        </button>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px', color: '#fff',
  fontSize: '14px', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit'
}

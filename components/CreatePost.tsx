import React, { useState } from 'react'
import { supabase } from '../utils/supabase'

interface CreatePostProps {
  currentUser: any
  onClose: () => void
  onPost: () => void
}

export default function CreatePost({ currentUser, onClose, onPost }: CreatePostProps) {
  const [postType, setPostType] = useState<'post' | 'reel' | 'signal'>('post')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Trade signal fields
  const [ticker, setTicker] = useState('')
  const [entry, setEntry] = useState('')
  const [target, setTarget] = useState('')
  const [stopLoss, setStopLoss] = useState('')
  const [confidence, setConfidence] = useState('75')

  const profile = currentUser?.profile

  const handleSubmit = async () => {
    if (!content.trim() && postType !== 'signal') {
      setError('Please write something!')
      return
    }
    if (postType === 'signal' && !ticker.trim()) {
      setError('Please enter a ticker symbol!')
      return
    }

    setLoading(true)
    setError('')

    let postContent = content
    if (postType === 'signal') {
      postContent = `🚨 Trade Signal: $${ticker.toUpperCase()}\n\n${content}\n\n📊 Entry: $${entry} | 🎯 Target: $${target} | 🛑 Stop: $${stopLoss} | 💪 Confidence: ${confidence}%`
    }

    const { error: insertError } = await supabase.from('posts').insert({
      user_id: currentUser.id,
      username: profile?.username || currentUser.email?.split('@')[0],
      full_name: profile?.full_name || 'Trader',
      avatar_url: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.id}`,
      content: postContent,
      image_url: imageUrl || null,
      post_type: postType,
      likes: 0,
      comments: 0
    })

    if (insertError) {
      setError('Failed to post. Please try again.')
      setLoading(false)
      return
    }

    setLoading(false)
    onPost()
  }

  const types = [
    { key: 'post', label: '📝 Post', desc: 'Share your thoughts' },
    { key: 'reel', label: '🎬 Reel', desc: 'Short video update' },
    { key: 'signal', label: '📊 Signal', desc: 'Trade signal alert' }
  ] as const

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end'
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: '100%', maxWidth: '430px', margin: '0 auto',
        background: '#1a1a2e', borderRadius: '24px 24px 0 0',
        padding: '24px', maxHeight: '90vh', overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: '700', margin: 0 }}>Create</h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: '#fff', fontSize: '18px', cursor: 'pointer' }}>×</button>
        </div>

        {/* Type selector */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {types.map(t => (
            <button key={t.key} onClick={() => setPostType(t.key)} style={{
              flex: 1, padding: '10px 6px',
              background: postType === t.key ? 'linear-gradient(135deg,#667eea,#764ba2)' : 'rgba(255,255,255,0.07)',
              border: 'none', borderRadius: '12px',
              color: '#fff', fontSize: '12px', fontWeight: '600',
              cursor: 'pointer'
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* User info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <img src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.id}`}
            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', background: '#333' }} alt="" />
          <div>
            <div style={{ color: '#fff', fontWeight: '700', fontSize: '14px' }}>{profile?.full_name || 'Trader'}</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>@{profile?.username || 'user'}</div>
          </div>
        </div>

        {/* Signal fields */}
        {postType === 'signal' && (
          <div style={{ background: 'rgba(102,126,234,0.1)', borderRadius: '16px', padding: '16px', marginBottom: '16px', border: '1px solid rgba(102,126,234,0.2)' }}>
            <div style={{ color: '#667eea', fontWeight: '700', fontSize: '14px', marginBottom: '12px' }}>📊 Trade Signal Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { label: 'Ticker', value: ticker, set: setTicker, placeholder: 'BTC, AAPL...' },
                { label: 'Confidence %', value: confidence, set: setConfidence, placeholder: '75' },
                { label: 'Entry Price', value: entry, set: setEntry, placeholder: '0.00' },
                { label: 'Target Price', value: target, set: setTarget, placeholder: '0.00' },
                { label: 'Stop Loss', value: stopLoss, set: setStopLoss, placeholder: '0.00' }
              ].map(f => (
                <div key={f.label}>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', marginBottom: '4px' }}>{f.label}</div>
                  <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                    style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={postType === 'signal' ? 'Add analysis notes...' : postType === 'reel' ? 'Describe your video...' : "What's on your mind?"}
          style={{
            width: '100%', minHeight: '100px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '14px', color: '#fff',
            fontSize: '15px', padding: '14px',
            outline: 'none', resize: 'vertical',
            boxSizing: 'border-box', fontFamily: 'inherit'
          }}
        />

        {/* Image URL */}
        <input
          value={imageUrl}
          onChange={e => setImageUrl(e.target.value)}
          placeholder="Image URL (optional)"
          style={{
            width: '100%', padding: '12px 14px', marginTop: '10px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px', color: '#fff',
            fontSize: '14px', outline: 'none', boxSizing: 'border-box'
          }}
        />

        {error && (
          <div style={{ color: '#ff3b30', fontSize: '13px', marginTop: '10px', textAlign: 'center' }}>{error}</div>
        )}

        <button onClick={handleSubmit} disabled={loading} style={{
          width: '100%', padding: '16px', marginTop: '16px',
          background: loading ? 'rgba(102,126,234,0.5)' : 'linear-gradient(135deg,#667eea,#764ba2)',
          border: 'none', borderRadius: '14px',
          color: '#fff', fontSize: '16px', fontWeight: '700',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}>
          {loading ? '⏳ Posting...' : '🚀 Post'}
        </button>
      </div>
    </div>
  )
}

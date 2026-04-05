import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import Stories from './Stories'

interface FeedProps {
  currentUser: any
}

export default function Feed({ currentUser }: FeedProps) {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      setPosts(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchPosts()

    // Real-time subscription
    const channel = supabase
      .channel('posts-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
        setPosts(prev => [payload.new as any, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const handleLike = async (post: any) => {
    const isLiked = likedPosts.has(post.id)
    const newLikes = isLiked ? post.likes - 1 : post.likes + 1

    setLikedPosts(prev => {
      const next = new Set(prev)
      isLiked ? next.delete(post.id) : next.add(post.id)
      return next
    })

    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes: newLikes } : p))

    await supabase.from('posts').update({ likes: newLikes }).eq('id', post.id)
  }

  const formatTime = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    return `${Math.floor(hrs / 24)}d`
  }

  return (
    <div style={{ paddingBottom: '20px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 16px 8px',
        background: 'linear-gradient(180deg, #0f0f1a 0%, transparent 100%)',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <h1 style={{ color: '#fff', fontSize: '26px', fontWeight: '800', margin: 0 }}>
          Socio<span style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Trade</span>
        </h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchPosts} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: '#fff', fontSize: '16px', cursor: 'pointer' }}>🔄</button>
          <button style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: '#fff', fontSize: '16px', cursor: 'pointer' }}>💬</button>
        </div>
      </div>

      <Stories />

      {/* Posts */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.5)' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
          Loading posts...
        </div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
          <div style={{ color: '#fff', fontSize: '18px', fontWeight: '700' }}>No posts yet</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginTop: '8px' }}>Be the first to post!</div>
        </div>
      ) : (
        posts.map(post => (
          <div key={post.id} style={{
            background: 'rgba(255,255,255,0.03)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            padding: '16px'
          }}>
            {/* Post header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <img src={post.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user_id}`}
                style={{ width: '42px', height: '42px', borderRadius: '50%', border: '2px solid #667eea', objectFit: 'cover', background: '#333' }} alt="" />
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontWeight: '700', fontSize: '14px' }}>{post.full_name}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>@{post.username} · {formatTime(post.created_at)}</div>
              </div>
              {post.post_type === 'signal' && (
                <span style={{ background: 'rgba(102,126,234,0.2)', color: '#667eea', fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(102,126,234,0.3)' }}>📊 SIGNAL</span>
              )}
              {post.post_type === 'reel' && (
                <span style={{ background: 'rgba(255,149,0,0.2)', color: '#ff9500', fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px' }}>🎬 REEL</span>
              )}
            </div>

            {/* Content */}
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '15px', lineHeight: '1.5', margin: '0 0 12px', whiteSpace: 'pre-wrap' }}>{post.content}</p>

            {/* Image */}
            {post.image_url && (
              <img src={post.image_url} alt="" style={{ width: '100%', borderRadius: '12px', marginBottom: '12px', maxHeight: '300px', objectFit: 'cover' }} />
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '20px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => handleLike(post)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: likedPosts.has(post.id) ? '#ff3b30' : 'rgba(255,255,255,0.5)',
                fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px'
              }}>
                {likedPosts.has(post.id) ? '❤️' : '🤍'} {post.likes}
              </button>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                💬 {post.comments}
              </button>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🔁 Share
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

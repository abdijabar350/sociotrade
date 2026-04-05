import React, { useState, useEffect } from 'react'
import { Heart, MessageCircle, Share2, Bookmark, TrendingUp, TrendingDown, Play } from 'lucide-react'
import Stories from './Stories'

interface FeedProps {
  currentUser: any
  onUserClick?: (username: string) => void
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function isYouTube(url: string) {
  return url.includes('youtube.com') || url.includes('youtu.be')
}

function getYouTubeEmbed(url: string) {
  let id = ''
  if (url.includes('youtu.be/')) id = url.split('youtu.be/')[1]?.split('?')[0]
  else if (url.includes('v=')) id = url.split('v=')[1]?.split('&')[0]
  return id ? `https://www.youtube.com/embed/${id}` : url
}

function VideoPlayer({ url }: { url: string }) {
  if (isYouTube(url)) {
    return (
      <iframe src={getYouTubeEmbed(url)} style={{ width: '100%', height: '220px', border: 'none', borderRadius: '12px' }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
    )
  }
  return (
    <video controls src={url} style={{ width: '100%', maxHeight: '280px', borderRadius: '12px', objectFit: 'cover' }}>
      <source src={url} />
    </video>
  )
}

function PostCard({ post, onLike, onUserClick }: { post: any; onLike: (id: string) => void; onUserClick?: (username: string) => void }) {
  const [liked, setLiked] = useState(post.liked || false)
  const [likeCount, setLikeCount] = useState(post.likes || 0)
  const [saved, setSaved] = useState(false)

  const handleLike = () => {
    const newLiked = !liked
    setLiked(newLiked)
    setLikeCount((c: number) => newLiked ? c + 1 : c - 1)
    onLike(post.id)
  }

  const postType = post.type || post.post_type || 'post'
  const isSignal = postType === 'signal'
  const isReel = postType === 'reel'

  // Extract signal data — supports both flat fields (localStorage) and signal_data JSONB (Supabase)
  const sd = post.signal_data || {}
  const signalDirection = sd.signal_direction || post.signal_direction || 'LONG'
  const ticker = sd.ticker || post.ticker || ''
  const confidence = sd.confidence || post.confidence || ''
  const entryPrice = sd.entry_price || post.entry_price || ''
  const targetPrice = sd.target_price || post.target_price || ''
  const stopLoss = sd.stop_loss || post.stop_loss || ''

  const handleUserClick = () => {
    if (post.username && onUserClick) onUserClick(post.username)
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '16px', marginBottom: '12px', overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px 10px', gap: '10px' }}>
        <img
          src={post.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.username}`}
          alt=""
          onClick={handleUserClick}
          style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover',
            border: '2px solid rgba(102,126,234,0.4)', cursor: onUserClick ? 'pointer' : 'default' }}
        />
        <div style={{ flex: 1, cursor: onUserClick ? 'pointer' : 'default' }} onClick={handleUserClick}>
          <div style={{ color: '#fff', fontWeight: '600', fontSize: '14px' }}>{post.full_name || post.username}</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
            @{post.username} · {timeAgo(post.created_at)}
            {isReel && <span style={{ marginLeft: '6px', color: '#a78bfa' }}>🎬 Reel</span>}
          </div>
        </div>
        {isSignal && (
          <span style={{
            padding: '4px 10px',
            background: signalDirection === 'LONG' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
            border: `1px solid ${signalDirection === 'LONG' ? '#22c55e' : '#ef4444'}`,
            borderRadius: '20px',
            color: signalDirection === 'LONG' ? '#22c55e' : '#ef4444',
            fontSize: '11px', fontWeight: '700'
          }}>
            {signalDirection === 'LONG' ? '▲' : '▼'} {signalDirection}
          </span>
        )}
      </div>

      {/* Signal Card */}
      {isSignal && (
        <div style={{ margin: '0 16px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{
            padding: '12px 16px',
            background: signalDirection === 'LONG' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            borderBottom: '1px solid rgba(255,255,255,0.06)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {signalDirection === 'LONG'
                ? <TrendingUp size={20} color="#22c55e" />
                : <TrendingDown size={20} color="#ef4444" />}
              <span style={{ color: '#fff', fontSize: '20px', fontWeight: '800' }}>{ticker}</span>
              {confidence && (
                <span style={{ marginLeft: 'auto', color: '#f59e0b', fontSize: '12px', fontWeight: '600' }}>
                  {confidence}% confidence
                </span>
              )}
            </div>
          </div>
          {(entryPrice || targetPrice || stopLoss) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '12px 16px', gap: '8px' }}>
              {[
                { label: 'Entry', val: entryPrice, color: '#fff' },
                { label: 'Target', val: targetPrice, color: '#22c55e' },
                { label: 'Stop', val: stopLoss, color: '#ef4444' },
              ].map(f => f.val ? (
                <div key={f.label} style={{ textAlign: 'center' }}>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '600', marginBottom: '3px' }}>{f.label}</div>
                  <div style={{ color: f.color, fontSize: '13px', fontWeight: '700' }}>{f.val}</div>
                </div>
              ) : null)}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {post.content && (
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', lineHeight: '1.5', padding: '0 16px 10px', margin: 0 }}>
          {post.content}
        </p>
      )}

      {/* Image */}
      {post.image_url && (
        <img src={post.image_url} alt=""
          style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', display: 'block' }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
      )}

      {/* Video */}
      {post.video_url && (
        <div style={{ padding: '0 0 10px' }}>
          <VideoPlayer url={post.video_url} />
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px 14px', gap: '18px' }}>
        <button onClick={handleLike} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', padding: 0 }}>
          <Heart size={20} color={liked ? '#ef4444' : 'rgba(255,255,255,0.5)'} fill={liked ? '#ef4444' : 'none'} />
          <span style={{ color: liked ? '#ef4444' : 'rgba(255,255,255,0.5)', fontSize: '13px' }}>{likeCount}</span>
        </button>
        <button style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', padding: 0 }}>
          <MessageCircle size={20} color="rgba(255,255,255,0.5)" />
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>{post.comments || 0}</span>
        </button>
        <button style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', padding: 0 }}>
          <Share2 size={20} color="rgba(255,255,255,0.5)" />
        </button>
        <button onClick={() => setSaved(s => !s)} style={{ background: 'none', border: 'none', marginLeft: 'auto', cursor: 'pointer', padding: 0 }}>
          <Bookmark size={20} color={saved ? '#667eea' : 'rgba(255,255,255,0.5)'} fill={saved ? '#667eea' : 'none'} />
        </button>
      </div>
    </div>
  )
}

export default function Feed({ currentUser, onUserClick }: FeedProps) {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadPosts = async () => {
    const local: any[] = JSON.parse(localStorage.getItem('st_posts') || '[]')

    try {
      const { supabase } = await import('../utils/supabase')
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (!error && data && data.length > 0) {
        const supabaseIds = new Set(data.map((p: any) => p.id))
        const localOnly = local.filter((p: any) => !supabaseIds.has(p.id))
        const merged = [...localOnly, ...data].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        setPosts(merged)
        setLoading(false)
        return
      }
    } catch {}

    setPosts(local)
    setLoading(false)
  }

  useEffect(() => {
    loadPosts()
    const interval = setInterval(loadPosts, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleLike = (postId: string) => {
    const posts: any[] = JSON.parse(localStorage.getItem('st_posts') || '[]')
    const updated = posts.map((p: any) => {
      if (p.id === postId) {
        const newLiked = !p.liked
        return { ...p, liked: newLiked, likes: newLiked ? (p.likes || 0) + 1 : Math.max((p.likes || 0) - 1, 0) }
      }
      return p
    })
    localStorage.setItem('st_posts', JSON.stringify(updated))
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f1a' }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 8px',
        background: 'rgba(15,15,26,0.95)',
        position: 'sticky', top: 0, zIndex: 10,
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h1 style={{ color: '#fff', fontSize: '22px', fontWeight: '800', margin: 0 }}>
            📈 SocioTrade
          </h1>
          <button onClick={loadPosts} style={{
            background: 'rgba(102,126,234,0.2)', border: '1px solid rgba(102,126,234,0.3)',
            borderRadius: '20px', padding: '6px 14px', color: '#667eea',
            fontSize: '12px', fontWeight: '600', cursor: 'pointer'
          }}>Refresh</button>
        </div>
        <Stories currentUser={currentUser} />
      </div>

      {/* Posts */}
      <div style={{ padding: '12px 12px 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>⏳</div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Loading feed...</p>
          </div>
        ) : posts.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            background: 'rgba(255,255,255,0.03)', borderRadius: '20px',
            border: '1px dashed rgba(255,255,255,0.1)', marginTop: '20px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
            <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '700', margin: '0 0 8px' }}>No posts yet</h3>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: 0 }}>
              Be the first to share a post, reel, or trade signal!
            </p>
          </div>
        ) : (
          posts.map(post => (
            <PostCard key={post.id} post={post} onLike={handleLike} onUserClick={onUserClick} />
          ))
        )}
      </div>
    </div>
  )
}

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
    setLoading(true)
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .neq('post_type', 'story')   // stories live in the stories bar
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) setPosts(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchPosts()

    const channel = supabase
      .channel('posts-feed')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'posts'
      }, payload => {
        const newPost = payload.new as any
        if (newPost.post_type !== 'story') {
          setPosts(prev => [newPost, ...prev])
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const handleLike = async (post: any) => {
    const isLiked = likedPosts.has(post.id)
    const newLikes = isLiked ? Math.max(0, post.likes - 1) : post.likes + 1

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

  const getYouTubeEmbed = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    return match ? `https://www.youtube.com/embed/${match[1]}` : null
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
          Socio<span style={{
            background: 'linear-gradient(135deg,#667eea,#764ba2)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>Trade</span>
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={fetchPosts} style={{
            background: 'rgba(255,255,255,0.08)', border: 'none',
            borderRadius: '50%', width: '36px', height: '36px',
            color: '#fff', fontSize: '16px', cursor: 'pointer'
          }}>🔄</button>
        </div>
      </div>

      {/* Stories */}
      <Stories currentUser={currentUser} />

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
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginTop: '8px' }}>Tap + to create the first post!</div>
        </div>
      ) : (
        posts.map(post => <PostCard key={post.id} post={post} liked={likedPosts.has(post.id)} onLike={handleLike} formatTime={formatTime} getYouTubeEmbed={getYouTubeEmbed} currentUser={currentUser} />)
      )}
    </div>
  )
}

function PostCard({ post, liked, onLike, formatTime, getYouTubeEmbed, currentUser }: any) {
  const isReel = post.post_type === 'reel'
  const isSignal = post.post_type === 'signal'
  const ytEmbed = post.video_url ? getYouTubeEmbed(post.video_url) : null
  const isMp4 = post.video_url && post.video_url.endsWith('.mp4')

  return (
    <div style={{
      background: isReel ? 'rgba(255,149,0,0.03)' : isSignal ? 'rgba(48,209,88,0.03)' : 'rgba(255,255,255,0.02)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      marginBottom: '2px'
    }}>
      {/* Post header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px 10px' }}>
        <img
          src={post.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user_id}`}
          style={{ width: '42px', height: '42px', borderRadius: '50%', border: '2px solid #667eea', objectFit: 'cover', background: '#333' }}
          alt=""
        />
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: '700', fontSize: '14px' }}>{post.full_name}</div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>@{post.username} · {formatTime(post.created_at)}</div>
        </div>
        {isSignal && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <span style={{ background: 'rgba(48,209,88,0.15)', color: '#30d158', fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(48,209,88,0.3)' }}>📊 SIGNAL</span>
            {post.signal_direction && (
              <span style={{
                fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '12px',
                background: post.signal_direction === 'LONG' ? 'rgba(48,209,88,0.15)' : 'rgba(255,59,48,0.15)',
                color: post.signal_direction === 'LONG' ? '#30d158' : '#ff3b30'
              }}>
                {post.signal_direction === 'LONG' ? '📈' : '📉'} {post.signal_direction}
              </span>
            )}
          </div>
        )}
        {isReel && (
          <span style={{ background: 'rgba(255,149,0,0.15)', color: '#ff9500', fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '20px' }}>🎬 REEL</span>
        )}
      </div>

      {/* Signal card */}
      {isSignal && post.ticker && (
        <div style={{
          margin: '0 16px 12px',
          background: 'linear-gradient(135deg, rgba(48,209,88,0.1), rgba(48,209,88,0.05))',
          borderRadius: '16px', padding: '14px',
          border: '1px solid rgba(48,209,88,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span style={{ color: '#30d158', fontSize: '22px', fontWeight: '900' }}>${post.ticker}</span>
            {post.confidence && (
              <span style={{
                background: 'rgba(48,209,88,0.2)', color: '#30d158',
                fontSize: '12px', fontWeight: '700',
                padding: '3px 10px', borderRadius: '20px'
              }}>💪 {post.confidence}% confidence</span>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            {post.entry_price && (
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '8px', textAlign: 'center' }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px' }}>ENTRY</div>
                <div style={{ color: '#fff', fontSize: '14px', fontWeight: '700' }}>${post.entry_price}</div>
              </div>
            )}
            {post.target_price && (
              <div style={{ background: 'rgba(48,209,88,0.1)', borderRadius: '10px', padding: '8px', textAlign: 'center' }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px' }}>TARGET</div>
                <div style={{ color: '#30d158', fontSize: '14px', fontWeight: '700' }}>${post.target_price}</div>
              </div>
            )}
            {post.stop_loss && (
              <div style={{ background: 'rgba(255,59,48,0.1)', borderRadius: '10px', padding: '8px', textAlign: 'center' }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px' }}>STOP</div>
                <div style={{ color: '#ff3b30', fontSize: '14px', fontWeight: '700' }}>${post.stop_loss}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content text */}
      {post.content && (
        <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: '15px', lineHeight: '1.5', margin: '0 16px 12px', whiteSpace: 'pre-wrap' }}>
          {post.content}
        </p>
      )}

      {/* Video embed (YouTube) */}
      {ytEmbed && (
        <div style={{ margin: '0 16px 12px', borderRadius: '14px', overflow: 'hidden', aspectRatio: '16/9' }}>
          <iframe
            src={ytEmbed}
            style={{ width: '100%', height: '100%', border: 'none' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* MP4 video */}
      {isMp4 && (
        <div style={{ margin: '0 16px 12px', borderRadius: '14px', overflow: 'hidden' }}>
          <video src={post.video_url} controls style={{ width: '100%', borderRadius: '14px', maxHeight: '360px' }} />
        </div>
      )}

      {/* Video URL (non-YouTube/mp4) */}
      {post.video_url && !ytEmbed && !isMp4 && (
        <a href={post.video_url} target="_blank" rel="noopener noreferrer" style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          margin: '0 16px 12px',
          background: 'rgba(255,149,0,0.1)', border: '1px solid rgba(255,149,0,0.2)',
          borderRadius: '12px', padding: '12px 14px',
          color: '#ff9500', textDecoration: 'none', fontWeight: '600', fontSize: '14px'
        }}>
          🎬 Watch Reel ↗
        </a>
      )}

      {/* Image */}
      {post.image_url && (
        <div style={{ margin: '0 0 12px' }}>
          <img src={post.image_url} alt="" style={{ width: '100%', maxHeight: '380px', objectFit: 'cover' }} />
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '4px', padding: '8px 16px 14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={() => onLike(post)} style={{
          background: liked ? 'rgba(255,59,48,0.1)' : 'none',
          border: 'none', cursor: 'pointer',
          color: liked ? '#ff3b30' : 'rgba(255,255,255,0.5)',
          fontSize: '13px', fontWeight: '700',
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: '7px 12px', borderRadius: '20px',
          transition: 'all 0.2s'
        }}>
          {liked ? '❤️' : '🤍'} {post.likes}
        </button>
        <button style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: '700',
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: '7px 12px', borderRadius: '20px'
        }}>
          💬 {post.comments}
        </button>
        <button style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: '700',
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: '7px 12px', borderRadius: '20px',
          marginLeft: 'auto'
        }}>
          🔁 Share
        </button>
      </div>
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import { ArrowLeft, TrendingUp, TrendingDown, Heart, MessageCircle, Share2 } from 'lucide-react'
import { supabase } from '../utils/supabase'
import { isVerified } from '../utils/verified'

interface UserProfileProps {
  username: string
  currentUser: any
  onBack: () => void
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

export default function UserProfile({ username, currentUser, onBack }: UserProfileProps) {
  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)

  const isOwnProfile = currentUser?.profile?.username === username || 
                       currentUser?.email === username

  useEffect(() => {
    loadProfile()
  }, [username])

  const loadProfile = async () => {
    setLoading(true)
    try {
      // Fetch profile by username
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single()

      if (prof) {
        setProfile(prof)
        setFollowerCount(prof.followers || 0)

        // Check if current user follows this person
        if (currentUser?.id) {
          const { data: followRow } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', currentUser.id)
            .eq('following_id', prof.id)
            .maybeSingle()
          setFollowing(!!followRow)
        }

        // Load their posts
        const { data: userPosts } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', prof.id)
          .order('created_at', { ascending: false })
          .limit(30)

        setPosts(userPosts || [])
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const handleFollowToggle = async () => {
    if (!currentUser?.id || !profile?.id || followLoading) return
    setFollowLoading(true)

    try {
      if (following) {
        // Unfollow
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', profile.id)

        // Decrement counts
        await supabase.rpc('decrement_followers', { target_id: profile.id }).catch(() => {
          supabase.from('profiles').update({ followers: Math.max(0, followerCount - 1) }).eq('id', profile.id)
        })
        setFollowerCount(c => Math.max(0, c - 1))
        setFollowing(false)
      } else {
        // Follow
        await supabase.from('follows').insert({
          follower_id: currentUser.id,
          following_id: profile.id,
          created_at: new Date().toISOString()
        })

        // Increment counts
        await supabase.rpc('increment_followers', { target_id: profile.id }).catch(() => {
          supabase.from('profiles').update({ followers: followerCount + 1 }).eq('id', profile.id)
        })
        setFollowerCount(c => c + 1)
        setFollowing(true)
      }
    } catch (e) {
      console.error('Follow error:', e)
    }
    setFollowLoading(false)
  }

  const verifiedInfo = profile ? isVerified({ 
    email: '', 
    username: profile.username, 
    followers: followerCount 
  }) : null

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>⏳</div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f0f1a' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px', gap: '12px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <ArrowLeft size={24} />
          </button>
          <span style={{ color: '#fff', fontWeight: '700' }}>Profile not found</span>
        </div>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px' }}>😕</div>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '12px' }}>User @{username} not found</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f1a', paddingBottom: '100px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '16px', gap: '12px',
        background: 'rgba(15,15,26,0.95)', position: 'sticky', top: 0, zIndex: 10,
        backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)'
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={24} />
        </button>
        <div>
          <div style={{ color: '#fff', fontWeight: '700', fontSize: '16px' }}>
            @{profile.username}
            {verifiedInfo?.verified && (
              <span style={{ marginLeft: '6px', fontSize: '16px' }}>
                {verifiedInfo.type === 'owner' ? '🏅' : '✅'}
              </span>
            )}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>{posts.length} posts</div>
        </div>
      </div>

      {/* Profile Banner + Avatar */}
      <div style={{ position: 'relative' }}>
        <div style={{ height: '120px', background: 'linear-gradient(135deg, #667eea, #764ba2)' }} />
        <div style={{ position: 'absolute', bottom: '-44px', left: '20px' }}>
          <img
            src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`}
            alt=""
            style={{ width: '88px', height: '88px', borderRadius: '50%', border: '4px solid #0f0f1a', objectFit: 'cover' }}
          />
        </div>
      </div>

      {/* Follow button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px', marginTop: '4px' }}>
        {!isOwnProfile && (
          <button
            onClick={handleFollowToggle}
            disabled={followLoading}
            style={{
              padding: '10px 28px',
              background: following
                ? 'rgba(255,255,255,0.08)'
                : 'linear-gradient(135deg, #667eea, #764ba2)',
              border: following ? '1px solid rgba(255,255,255,0.2)' : 'none',
              borderRadius: '24px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: '700',
              cursor: followLoading ? 'default' : 'pointer',
              opacity: followLoading ? 0.6 : 1,
              transition: 'all 0.2s'
            }}
          >
            {followLoading ? '...' : following ? 'Following ✓' : 'Follow'}
          </button>
        )}
      </div>

      {/* Profile Info */}
      <div style={{ padding: '0 20px 20px', marginTop: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ color: '#fff', fontSize: '20px', fontWeight: '800' }}>
            {profile.full_name || profile.username}
          </span>
          {verifiedInfo?.verified && (
            <span style={{ fontSize: '20px' }}>
              {verifiedInfo.type === 'owner' ? '🏅' : '✅'}
            </span>
          )}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', marginBottom: '10px' }}>
          @{profile.username}
        </div>
        {profile.bio && (
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px', lineHeight: '1.5', margin: '0 0 12px' }}>
            {profile.bio}
          </p>
        )}
        {profile.website && (
          <div style={{ color: '#667eea', fontSize: '13px', marginBottom: '12px' }}>
            🔗 {profile.website}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'flex', gap: '32px', marginBottom: '20px' }}>
          {[
            { label: 'Posts', value: posts.length },
            { label: 'Followers', value: followerCount },
            { label: 'Following', value: profile.following || 0 },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{ color: '#fff', fontSize: '18px', fontWeight: '800' }}>
                {stat.value >= 1000 ? `${(stat.value / 1000).toFixed(1)}K` : stat.value}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Posts Grid / List */}
      <div style={{ padding: '0 12px' }}>
        {posts.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '40px 20px',
            background: 'rgba(255,255,255,0.03)', borderRadius: '16px',
            border: '1px dashed rgba(255,255,255,0.1)'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📭</div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>No posts yet</p>
          </div>
        ) : (
          posts.map(post => {
            const postType = post.type || post.post_type || 'post'
            const isSignal = postType === 'signal'
            const sd = post.signal_data || {}
            const signalDir = sd.signal_direction || post.signal_direction || 'LONG'
            const ticker = sd.ticker || post.ticker || ''

            return (
              <div key={post.id} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '16px', marginBottom: '12px', overflow: 'hidden'
              }}>
                {/* Post type badge */}
                {isSignal && (
                  <div style={{ padding: '12px 16px 0', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{
                      padding: '3px 10px',
                      background: signalDir === 'LONG' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                      border: `1px solid ${signalDir === 'LONG' ? '#22c55e' : '#ef4444'}`,
                      borderRadius: '20px',
                      color: signalDir === 'LONG' ? '#22c55e' : '#ef4444',
                      fontSize: '11px', fontWeight: '700'
                    }}>
                      {signalDir === 'LONG' ? '▲' : '▼'} {signalDir} {ticker && `· ${ticker}`}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>
                      {timeAgo(post.created_at)}
                    </span>
                  </div>
                )}

                {post.content && (
                  <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', lineHeight: '1.5', padding: '12px 16px', margin: 0 }}>
                    {post.content}
                  </p>
                )}

                {post.image_url && (
                  <img src={post.image_url} alt=""
                    style={{ width: '100%', maxHeight: '280px', objectFit: 'cover', display: 'block' }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                )}

                <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px 14px', gap: '18px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                    <Heart size={16} /> {post.likes || 0}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                    <MessageCircle size={16} /> {post.comments || 0}
                  </span>
                  {!isSignal && (
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginLeft: 'auto' }}>
                      {timeAgo(post.created_at)}
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

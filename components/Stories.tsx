import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'

interface StoryViewerProps {
  story: any
  onClose: () => void
}

const StoryViewer: React.FC<StoryViewerProps> = ({ story, onClose }) => {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { onClose(); return 100 }
        return p + 2
      })
    }, 100)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: '#000',
      display: 'flex', flexDirection: 'column',
      maxWidth: '430px', margin: '0 auto'
    }} onClick={onClose}>
      {/* Progress bar */}
      <div style={{ height: '3px', background: 'rgba(255,255,255,0.2)', margin: '12px 12px 0', borderRadius: '2px' }}>
        <div style={{
          height: '100%', background: '#fff',
          borderRadius: '2px', width: `${progress}%`,
          transition: 'width 0.1s linear'
        }} />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px' }}>
        <img
          src={story.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${story.user_id}`}
          style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #fff' }}
          alt=""
        />
        <div>
          <div style={{ color: '#fff', fontWeight: '700', fontSize: '14px' }}>{story.full_name}</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>@{story.username}</div>
        </div>
        <button onClick={onClose} style={{
          marginLeft: 'auto', background: 'none', border: 'none',
          color: '#fff', fontSize: '24px', cursor: 'pointer'
        }}>×</button>
      </div>

      {/* Story content */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {story.image_url ? (
          <img src={story.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
        ) : (
          <div style={{
            background: `linear-gradient(135deg, #667eea, #764ba2)`,
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <div style={{ fontSize: '60px', marginBottom: '16px' }}>💬</div>
              <p style={{ color: '#fff', fontSize: '22px', fontWeight: '700', lineHeight: '1.4', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                {story.content}
              </p>
            </div>
          </div>
        )}
        {/* Caption overlay */}
        {story.image_url && story.content && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '60px 20px 20px',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.8))'
          }}>
            <p style={{ color: '#fff', fontSize: '16px', fontWeight: '600', margin: 0 }}>{story.content}</p>
          </div>
        )}
      </div>

      {/* Reply bar */}
      <div style={{ padding: '12px 16px 28px', display: 'flex', gap: '10px' }} onClick={e => e.stopPropagation()}>
        <input
          placeholder={`Reply to ${story.username}...`}
          style={{
            flex: 1, padding: '10px 14px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '24px', color: '#fff',
            fontSize: '14px', outline: 'none'
          }}
        />
        <button style={{ background: 'none', border: 'none', color: '#fff', fontSize: '22px', cursor: 'pointer' }}>❤️</button>
      </div>
    </div>
  )
}

interface StoriesProps {
  currentUser?: any
}

export const Stories: React.FC<StoriesProps> = ({ currentUser }) => {
  const [stories, setStories] = useState<any[]>([])
  const [viewingStory, setViewingStory] = useState<any | null>(null)

  useEffect(() => {
    const fetchStories = async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data } = await supabase
        .from('posts')
        .select('*')
        .eq('post_type', 'story')
        .gte('created_at', since)
        .order('created_at', { ascending: false })

      if (data) setStories(data)
    }

    fetchStories()

    // Real-time new stories
    const channel = supabase
      .channel('stories-feed')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'posts',
        filter: 'post_type=eq.story'
      }, payload => {
        setStories(prev => [payload.new as any, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Group by user, keep latest per user
  const uniqueStories = stories.reduce((acc: any[], story) => {
    if (!acc.find(s => s.user_id === story.user_id)) acc.push(story)
    return acc
  }, [])

  const myStory = currentUser ? uniqueStories.find(s => s.user_id === currentUser.id) : null
  const otherStories = uniqueStories.filter(s => !currentUser || s.user_id !== currentUser.id)

  return (
    <>
      <div style={{
        display: 'flex', gap: '12px',
        padding: '12px 16px', overflowX: 'auto',
        scrollbarWidth: 'none'
      }}>
        {/* Your story slot */}
        {currentUser && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
            <div
              onClick={() => myStory ? setViewingStory(myStory) : null}
              style={{
                width: '60px', height: '60px', borderRadius: '50%',
                background: myStory ? 'linear-gradient(135deg, #ff6b6b, #ff9500)' : 'rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: myStory ? 'pointer' : 'default',
                padding: '2px', position: 'relative'
              }}
            >
              <img
                src={currentUser.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.id}`}
                style={{ width: '54px', height: '54px', borderRadius: '50%', border: '2px solid #0f0f1a', objectFit: 'cover', background: '#333' }}
                alt=""
              />
              {!myStory && (
                <div style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: '20px', height: '20px',
                  background: '#667eea', borderRadius: '50%',
                  border: '2px solid #0f0f1a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: '900', color: '#fff'
                }}>+</div>
              )}
            </div>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', width: '62px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {myStory ? 'Your Story' : 'Add Story'}
            </span>
          </div>
        )}

        {/* Other stories */}
        {otherStories.map(story => (
          <div
            key={story.id}
            onClick={() => setViewingStory(story)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', flexShrink: 0, cursor: 'pointer' }}
          >
            <div style={{
              width: '60px', height: '60px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #ff6b6b, #ff9500)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '2px'
            }}>
              <img
                src={story.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${story.user_id}`}
                style={{ width: '54px', height: '54px', borderRadius: '50%', border: '2px solid #0f0f1a', objectFit: 'cover', background: '#333' }}
                alt=""
              />
            </div>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', width: '62px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {story.username}
            </span>
          </div>
        ))}

        {/* Empty state */}
        {!currentUser && uniqueStories.length === 0 && (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', padding: '16px 0' }}>
            No stories yet
          </div>
        )}
      </div>

      {viewingStory && (
        <StoryViewer story={viewingStory} onClose={() => setViewingStory(null)} />
      )}
    </>
  )
}

export default Stories

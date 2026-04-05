import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { supabase } from './utils/supabase'
import Login from './components/Login'
import NavBar from './components/NavBar'
import Feed from './components/Feed'
import Explore from './components/Explore'
import CreatePost from './components/CreatePost'
import Market from './components/Market'
import Messages from './components/Messages'
import Profile from './components/Profile'
import Notifications from './components/Notifications'
import UserProfile from './components/UserProfile'

type Tab = 'feed' | 'explore' | 'post' | 'market' | 'messages' | 'profile' | 'notifications'

async function buildUser(supabaseUser: any) {
  let profile = null
  try {
    const { data } = await supabase.from('profiles').select('*').eq('id', supabaseUser.id).single()
    profile = data
  } catch {}
  // Fallback profile from user metadata if DB profile not ready yet
  if (!profile) {
    const meta = supabaseUser.user_metadata || {}
    profile = {
      id: supabaseUser.id,
      username: meta.username || supabaseUser.email?.split('@')[0] || 'user',
      full_name: meta.full_name || '',
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${supabaseUser.id}`,
      bio: '',
      followers: 0,
      following: 0,
    }
  }
  return { ...supabaseUser, profile, id: supabaseUser.id }
}

function App() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('feed')
  const [showCreate, setShowCreate] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(2)
  const [unreadNotifications, setUnreadNotifications] = useState(3)
  const [viewedUsername, setViewedUsername] = useState<string | null>(null)

  useEffect(() => {
    // Restore session on mount
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (session?.user) {
          const user = await buildUser(session.user)
          setCurrentUser(user)
        } else {
          // Try localStorage fallback
          const stored = localStorage.getItem('sociotrade_user')
          if (stored) {
            try {
              const u = JSON.parse(stored)
              if (u?.id) setCurrentUser(u)
            } catch {}
          }
        }
        setLoading(false)
      })
      .catch(() => {
        // Supabase unavailable — try localStorage
        const stored = localStorage.getItem('sociotrade_user')
        if (stored) {
          try {
            const u = JSON.parse(stored)
            if (u?.id) setCurrentUser(u)
          } catch {}
        }
        setLoading(false)
      })

    // Listen for auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null)
        setActiveTab('feed')
        setViewedUsername(null)
        localStorage.removeItem('sociotrade_user')
      } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        const user = await buildUser(session.user)
        setCurrentUser(user)
        localStorage.setItem('sociotrade_user', JSON.stringify(user))
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = (user: any) => {
    setCurrentUser(user)
    localStorage.setItem('sociotrade_user', JSON.stringify(user))
    setActiveTab('feed')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut().catch(() => {})
    setCurrentUser(null)
    localStorage.removeItem('sociotrade_user')
  }

  const handleTabChange = (tab: Tab) => {
    if (tab === 'post') {
      setShowCreate(true)
      return
    }
    setViewedUsername(null)
    setActiveTab(tab)
    if (tab === 'messages') setUnreadMessages(0)
    if (tab === 'notifications') setUnreadNotifications(0)
  }

  const handleUserClick = (username: string) => {
    const myUsername = currentUser?.profile?.username
    if (username === myUsername) {
      setViewedUsername(null)
      setActiveTab('profile')
      return
    }
    setViewedUsername(username)
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0f1a, #1a1a2e)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '16px'
      }}>
        <div style={{ fontSize: '48px' }}>📈</div>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(102,126,234,0.3)', borderTop: '3px solid #667eea', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px' }}>Loading SocioTrade...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} />
  }

  // Show another user's profile
  if (viewedUsername) {
    return (
      <div style={{ maxWidth: '430px', margin: '0 auto', minHeight: '100vh', background: '#0f0f1a', position: 'relative' }}>
        <UserProfile
          username={viewedUsername}
          currentUser={currentUser}
          onBack={() => setViewedUsername(null)}
        />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '430px', margin: '0 auto', minHeight: '100vh', background: '#0f0f1a', position: 'relative', paddingBottom: '80px' }}>
      {activeTab === 'feed' && <Feed currentUser={currentUser} onUserClick={handleUserClick} />}
      {activeTab === 'explore' && <Explore onUserClick={handleUserClick} />}
      {activeTab === 'market' && <Market currentUser={currentUser} />}
      {activeTab === 'messages' && <Messages currentUser={currentUser} />}
      {activeTab === 'profile' && <Profile currentUser={currentUser} onLogout={handleLogout} />}
      {activeTab === 'notifications' && <Notifications />}

      {showCreate && (
        <CreatePost
          currentUser={currentUser}
          onClose={() => setShowCreate(false)}
          onPost={() => { setShowCreate(false); setActiveTab('feed') }}
        />
      )}

      <NavBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        unreadMessages={unreadMessages}
        unreadNotifications={unreadNotifications}
      />
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<App />)

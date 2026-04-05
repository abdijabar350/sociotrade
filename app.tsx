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

type Tab = 'feed' | 'explore' | 'post' | 'market' | 'messages' | 'profile' | 'notifications'

function App() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('feed')
  const [showCreate, setShowCreate] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(2)
  const [unreadNotifications, setUnreadNotifications] = useState(3)

  useEffect(() => {
    // Check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setCurrentUser({ ...session.user, profile })
      }
      setLoading(false)
    })

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null)
        setActiveTab('feed')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = (user: any) => {
    setCurrentUser(user)
    setActiveTab('feed')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setCurrentUser(null)
  }

  const handleTabChange = (tab: Tab) => {
    if (tab === 'post') {
      setShowCreate(true)
      return
    }
    setActiveTab(tab)
    if (tab === 'messages') setUnreadMessages(0)
    if (tab === 'notifications') setUnreadNotifications(0)
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
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px' }}>Loading SocioTrade...</p>
      </div>
    )
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div style={{ maxWidth: '430px', margin: '0 auto', minHeight: '100vh', background: '#0f0f1a', position: 'relative', paddingBottom: '80px' }}>
      {activeTab === 'feed' && <Feed currentUser={currentUser} />}
      {activeTab === 'explore' && <Explore />}
      {activeTab === 'market' && <Market />}
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

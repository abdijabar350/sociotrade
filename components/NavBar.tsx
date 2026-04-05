import React from 'react'

type Tab = 'feed' | 'explore' | 'post' | 'market' | 'messages' | 'profile' | 'notifications'

interface NavBarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  unreadMessages?: number
  unreadNotifications?: number
}

const NavBar: React.FC<NavBarProps> = ({ activeTab, onTabChange, unreadMessages = 0, unreadNotifications = 0 }) => {
  const tabs: { id: Tab; icon: string; label: string }[] = [
    { id: 'feed', icon: '🏠', label: 'Home' },
    { id: 'explore', icon: '🔍', label: 'Explore' },
    { id: 'post', icon: '➕', label: 'Post' },
    { id: 'market', icon: '📈', label: 'Market' },
    { id: 'messages', icon: '💬', label: 'DMs' },
    { id: 'notifications', icon: '🔔', label: 'Alerts' },
    { id: 'profile', icon: '👤', label: 'Profile' },
  ]

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: '430px',
      background: 'rgba(15,15,26,0.95)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      justifyContent: 'space-around',
      padding: '8px 0 env(safe-area-inset-bottom, 8px)',
      zIndex: 100
    }}>
      {tabs.map(tab => {
        const isActive = activeTab === tab.id
        const badge = tab.id === 'messages' ? unreadMessages : tab.id === 'notifications' ? unreadNotifications : 0
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              cursor: 'pointer',
              padding: '4px 8px',
              position: 'relative',
              opacity: isActive ? 1 : 0.5,
              transform: isActive ? 'scale(1.05)' : 'scale(1)',
              transition: 'all 0.2s'
            }}
          >
            {tab.id === 'post' ? (
              <div style={{
                width: '44px', height: '44px',
                background: 'linear-gradient(135deg,#667eea,#764ba2)',
                borderRadius: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '22px',
                boxShadow: isActive ? '0 4px 15px rgba(102,126,234,0.5)' : 'none'
              }}>{tab.icon}</div>
            ) : (
              <span style={{ fontSize: '22px' }}>{tab.icon}</span>
            )}
            {tab.id !== 'post' && (
              <span style={{ color: isActive ? '#667eea' : '#fff', fontSize: '9px', fontWeight: '600' }}>{tab.label}</span>
            )}
            {badge > 0 && (
              <div style={{
                position: 'absolute', top: '0', right: '4px',
                background: '#ff3b30', borderRadius: '50%',
                width: '16px', height: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '9px', color: '#fff', fontWeight: '800'
              }}>{badge}</div>
            )}
          </button>
        )
      })}
    </nav>
  )
}

export default NavBar

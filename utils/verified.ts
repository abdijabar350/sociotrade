// Verification logic
// Owner is always verified. Others get verified at 1M followers.

const OWNER_EMAILS = ['abdijabarmuhammad7@gmail.com']
const OWNER_USERNAMES = ['abdijabar350', 'abdijabar']

export function isVerified(user: {
  email?: string
  username?: string
  followers?: number
}): boolean {
  if (!user) return false

  // Owner is always verified
  if (user.email && OWNER_EMAILS.includes(user.email.toLowerCase())) return true
  if (user.username && OWNER_USERNAMES.includes(user.username.toLowerCase())) return true

  // Everyone else earns it at 1,000,000 followers
  if (user.followers && user.followers >= 1_000_000) return true

  return false
}

export function getVerifiedBadgeColor(user: {
  email?: string
  username?: string
  followers?: number
}): string {
  if (!user) return ''
  // Owner gets gold badge, others get blue
  if (user.email && OWNER_EMAILS.includes(user.email.toLowerCase())) return 'text-warning' // gold
  if (user.username && OWNER_USERNAMES.includes(user.username.toLowerCase())) return 'text-warning'
  return 'text-info' // blue for earned
}

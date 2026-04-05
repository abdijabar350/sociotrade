import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://nwtveufwlxfaashsiqlc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53dHZldWZ3bHhmYWFzaHNpcWxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNTAzODYsImV4cCI6MjA5MDkyNjM4Nn0.tRnv4cn-GA3UdsyC3Q2wx4NoYWR-delYiOFHCtLdFLs'
)

export type Profile = {
  id: string
  username: string
  full_name: string
  avatar_url: string
  bio: string
  followers: number
  following: number
}

export type PostDB = {
  id: string
  user_id: string
  username: string
  full_name: string
  avatar_url: string
  content: string
  image_url?: string
  post_type: string
  likes: number
  comments: number
  created_at: string
}

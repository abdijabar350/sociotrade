import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://nwtveufwlxfaashsiqlc.supabase.co',
  'sb_publishable_yIzTbpAvpj0rfoHxCKhj6w_2vHqMjP4'
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

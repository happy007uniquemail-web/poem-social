export interface Profile {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  follower_count: number
  following_count: number
  created_at: string
}

export interface Poem {
  id: string
  author_id: string
  title: string
  body: string
  is_public: boolean
  like_count: number
  comment_count: number
  repost_count: number
  created_at: string
  updated_at: string
  author?: Profile | null
  tags?: Tag[]
}

export interface Comment {
  id: string
  poem_id: string
  author_id: string
  body: string
  created_at: string
  author?: Profile | null
}

export interface Tag {
  id: string
  name: string
}

export interface Repost {
  id: string
  poem_id: string
  user_id: string
  created_at: string
  user?: Profile | null
  poem?: Poem | null
}

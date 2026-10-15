export interface Profile {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  created_at: string
}

export interface Poem {
  id: string
  author_id: string
  title: string
  body: string
  is_public: boolean
  like_count: number
  created_at: string
  updated_at: string
  author?: Profile | null
}

/**
 * Supabase Database type definitions for Fresh Context Brand Studio.
 *
 * Run the Supabase SQL migration (see supabase/migrations/) to create these
 * tables, then regenerate types with:
 *   npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/types/database.ts
 *
 * For now these are hand-written to match the schema we need.
 */

export interface Database {
  public: {
    Tables: {
      shot_types: {
        Row: ShotTypeRow
        Insert: ShotTypeInsert
        Update: ShotTypeUpdate
        Relationships: []
      }
      generations: {
        Row: GenerationRow
        Insert: GenerationInsert
        Update: GenerationUpdate
        Relationships: [
          {
            foreignKeyName: 'generations_shot_type_id_fkey'
            columns: ['shot_type_id']
            referencedRelation: 'shot_types'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'generations_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      profiles: {
        Row: ProfileRow
        Insert: ProfileInsert
        Update: ProfileUpdate
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      media_type: 'image' | 'video'
      generation_status: 'pending' | 'generating' | 'complete' | 'failed'
      user_role: 'admin' | 'editor' | 'viewer'
    }
  }
}

// ── Shot Types ──────────────────────────────────────────────────────────

export interface ShotTypeRow {
  id: string
  name: string
  description: string
  media_type: 'image' | 'video'
  system_prompt: string
  default_aspect_ratio: string
  default_variants: number
  reference_image_urls: string[] // up to 4 reference image URLs in Supabase Storage
  parameter_visibility: Record<string, boolean>
  created_by: string
  created_at: string
  updated_at: string
  version: number
}

export interface ShotTypeInsert {
  id?: string
  name: string
  description?: string
  media_type?: 'image' | 'video'
  system_prompt?: string
  default_aspect_ratio?: string
  default_variants?: number
  reference_image_urls?: string[]
  parameter_visibility?: Record<string, boolean>
  created_by: string
}

export interface ShotTypeUpdate {
  name?: string
  description?: string
  media_type?: 'image' | 'video'
  system_prompt?: string
  default_aspect_ratio?: string
  default_variants?: number
  reference_image_urls?: string[]
  parameter_visibility?: Record<string, boolean>
  version?: number
  updated_at?: string
}

// ── Generations ─────────────────────────────────────────────────────────

export interface GenerationRow {
  id: string
  shot_type_id: string
  user_id: string
  prompt: string
  media_type: 'image' | 'video'
  aspect_ratio: string
  variants: number
  status: 'pending' | 'generating' | 'complete' | 'failed'
  result_urls: string[]
  error_message: string | null
  user_image_url: string | null
  starred: boolean
  metadata: Record<string, unknown>
  created_at: string
  completed_at: string | null
}

export interface GenerationInsert {
  id?: string
  shot_type_id: string
  user_id: string
  prompt: string
  media_type?: 'image' | 'video'
  aspect_ratio?: string
  variants?: number
  status?: 'pending' | 'generating' | 'complete' | 'failed'
  result_urls?: string[]
  error_message?: string | null
  user_image_url?: string | null
  starred?: boolean
  metadata?: Record<string, unknown>
}

export interface GenerationUpdate {
  status?: 'pending' | 'generating' | 'complete' | 'failed'
  result_urls?: string[]
  error_message?: string | null
  starred?: boolean
  completed_at?: string | null
  metadata?: Record<string, unknown>
}

// ── Profiles ────────────────────────────────────────────────────────────

export interface ProfileRow {
  id: string // matches auth.users.id
  email: string
  display_name: string
  avatar_url: string | null
  role: 'admin' | 'editor' | 'viewer'
  created_at: string
}

export interface ProfileInsert {
  id: string
  email: string
  display_name?: string
  avatar_url?: string | null
  role?: 'admin' | 'editor' | 'viewer'
}

export interface ProfileUpdate {
  email?: string
  display_name?: string
  avatar_url?: string | null
  role?: 'admin' | 'editor' | 'viewer'
}

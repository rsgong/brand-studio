/**
 * Generation API — calls n8n webhook endpoints for image and video creation.
 *
 * Image workflow: synchronous — returns base64 images directly.
 * Video workflow: async — returns 202 with generation_id, then polls or uses callback.
 */

import { supabase } from './supabase'
import type { ShotTypeRow } from '@/types'

const N8N_URL = import.meta.env.VITE_N8N_WEBHOOK_URL
const PASSPHRASE = import.meta.env.VITE_N8N_PASSPHRASE
const IMAGE_WEBHOOK_PATH = import.meta.env.VITE_N8N_IMAGE_WEBHOOK_PATH
const VIDEO_WEBHOOK_PATH = import.meta.env.VITE_N8N_VIDEO_WEBHOOK_PATH

// ── Image Generation (synchronous via n8n) ──────────────────────────────

interface GenerateImageParams {
  shotType: ShotTypeRow
  prompt: string
  aspectRatio: string
  variants: number
  userImageFile?: File | null
  userId: string
}

interface ImageResult {
  images: Array<{ mimeType: string; base64: string }>
}

export async function generateImage(params: GenerateImageParams): Promise<ImageResult> {
  const { shotType, prompt, aspectRatio, variants, userImageFile } = params

  // If user uploaded an image, store it in Supabase Storage to get a URL
  let userImageUrl: string | undefined
  if (userImageFile) {
    const path = `user-uploads/${crypto.randomUUID()}-${userImageFile.name}`
    const { error } = await supabase.storage.from('generation-assets').upload(path, userImageFile)
    if (!error) {
      const { data } = supabase.storage.from('generation-assets').getPublicUrl(path)
      userImageUrl = data.publicUrl
    }
  }

  // Build the payload matching the n8n webhook schema
  const body: Record<string, unknown> = {
    passphrase: PASSPHRASE,
    system_prompt: shotType.system_prompt,
    prompt,
    aspect: aspectRatio,
    variants,
    quality: 'auto',
    output_format: 'png',
    // Reference images from the shot type
    reference_image_1_url: shotType.reference_image_urls?.[0] ?? '',
    reference_image_2_url: shotType.reference_image_urls?.[1] ?? '',
    reference_image_3_url: shotType.reference_image_urls?.[2] ?? '',
    reference_image_4_url: shotType.reference_image_urls?.[3] ?? '',
  }

  if (userImageUrl) {
    body.user_image_url = userImageUrl
  }

  const response = await fetch(`${N8N_URL}/${IMAGE_WEBHOOK_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Image generation failed: ${response.status} ${text}`)
  }

  return response.json()
}

// ── Video Generation (async via n8n + callback) ─────────────────────────

interface GenerateVideoParams {
  shotType: ShotTypeRow
  prompt: string
  aspectRatio: string
  userId: string
  firstFrameBase64?: string
  lastFrameBase64?: string
  sampleCount?: number
  durationSeconds?: number
  generationId?: string
}

interface VideoAcceptedResponse {
  status: 'accepted'
  generation_id: string
}

export async function generateVideo(params: GenerateVideoParams): Promise<VideoAcceptedResponse> {
  const { prompt, aspectRatio, userId, sampleCount, durationSeconds, generationId } = params

  // Use provided generationId or create a new one
  const genId = generationId ?? crypto.randomUUID()

  const body: Record<string, unknown> = {
    passphrase: PASSPHRASE,
    generation_id: genId,
    user_id: userId,
    prompt,
    aspect_ratio: aspectRatio,
    sample_count: sampleCount ?? 2,
    duration_seconds: durationSeconds ?? 8,
  }

  // Only include first frame if provided
  if (params.firstFrameBase64) {
    body.first_frame_base64 = params.firstFrameBase64
    body.first_frame_mime = 'image/jpeg'
  }

  // Only include last frame if provided
  if (params.lastFrameBase64) {
    body.last_frame_base64 = params.lastFrameBase64
    body.last_frame_mime = 'image/jpeg'
  }

  const response = await fetch(`${N8N_URL}/${VIDEO_WEBHOOK_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Video generation failed: ${response.status} ${text}`)
  }

  return response.json()
}

// ── Poll for video completion (alternative to callback) ─────────────────

export async function pollVideoGeneration(generationId: string): Promise<GenerationRow | null> {
  const { data } = await supabase
    .from('generations')
    .select('*')
    .eq('id', generationId)
    .single()

  return data
}

// Re-export the type for convenience
import type { GenerationRow } from '@/types'

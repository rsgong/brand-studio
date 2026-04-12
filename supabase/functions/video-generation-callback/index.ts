import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PASSPHRASE = Deno.env.get('N8N_PASSPHRASE') || ''

interface CallbackPayload {
  passphrase: string
  generation_id: string
  user_id: string
  status: 'complete' | 'failed'
  videos?: Array<{ uri: string; index: number }>
  video_count?: number
  errors?: Array<{ index: number; error: string }>
  error_message?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const payload: CallbackPayload = await req.json()

    // Verify passphrase
    if (payload.passphrase !== PASSPHRASE) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Create Supabase client with service role for DB updates
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Build the update payload
    const update: Record<string, unknown> = {
      status: payload.status,
      completed_at: new Date().toISOString(),
    }

    if (payload.status === 'complete' && payload.videos) {
      // Store video URIs
      update.result_urls = payload.videos
        .sort((a, b) => a.index - b.index)
        .map((v) => v.uri)
    }

    if (payload.status === 'failed') {
      update.error_message = payload.error_message ||
        payload.errors?.map((e) => `[${e.index}] ${e.error}`).join('; ') ||
        'Video generation failed'
    }

    // Update the generation record
    const { error } = await supabase
      .from('generations')
      .update(update)
      .eq('id', payload.generation_id)

    if (error) {
      console.error('Failed to update generation:', error)
      return new Response(JSON.stringify({ error: 'Database update failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Callback error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

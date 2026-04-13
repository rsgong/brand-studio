const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL') || ''
const N8N_PASSPHRASE = Deno.env.get('N8N_PASSPHRASE') || ''

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
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }

  try {
    const body = await req.json()

    // Forward request to n8n with passphrase
    const n8nResponse = await fetch(`${N8N_WEBHOOK_URL}/brand-studio-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        passphrase: N8N_PASSPHRASE,
      }),
    })

    const data = await n8nResponse.json()

    return new Response(JSON.stringify(data), {
      status: n8nResponse.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    console.error('Proxy error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
})

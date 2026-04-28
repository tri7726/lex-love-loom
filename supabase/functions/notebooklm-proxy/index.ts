import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// NotebookLM internal API endpoints
const NOTEBOOKLM_API = 'https://notebooklm.google.com/api'

interface QueryRequest {
  action: 'query' | 'list_notebooks' | 'save_session'
  notebook_id?: string
  query?: string
  cookies?: string
}

async function queryNotebook(cookies: string, notebookId: string, queryText: string): Promise<string> {
  // NotebookLM uses a specific RPC-style API
  const url = `${NOTEBOOKLM_API}/v1/notebooks/${notebookId}:query`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies,
      'Origin': 'https://notebooklm.google.com',
      'Referer': 'https://notebooklm.google.com/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    },
    body: JSON.stringify({
      query: queryText,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`NotebookLM API error ${response.status}: ${text.substring(0, 200)}`)
  }

  const data = await response.text()
  return data
}

async function listNotebooks(cookies: string): Promise<unknown> {
  const url = `${NOTEBOOKLM_API}/v1/notebooks`
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Cookie': cookies,
      'Origin': 'https://notebooklm.google.com',
      'Referer': 'https://notebooklm.google.com/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`NotebookLM API error ${response.status}: ${text.substring(0, 200)}`)
  }

  return await response.json()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(
      authHeader.replace('Bearer ', '')
    )
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { 
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const userId = claimsData.claims.sub as string
    const body: QueryRequest = await req.json()

    // Handle save_session action
    if (body.action === 'save_session') {
      if (!body.cookies) {
        return new Response(JSON.stringify({ error: 'Cookies are required' }), { 
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      const { error } = await supabase
        .from('notebooklm_sessions')
        .upsert({
          user_id: userId,
          cookies: body.cookies,
          notebook_id: body.notebook_id || null,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // For query/list actions, get stored cookies
    const { data: session } = await supabase
      .from('notebooklm_sessions')
      .select('cookies, notebook_id')
      .eq('user_id', userId)
      .single()

    if (!session?.cookies) {
      return new Response(JSON.stringify({ 
        error: 'No NotebookLM session found. Please save your cookies first.' 
      }), { 
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    if (body.action === 'list_notebooks') {
      const notebooks = await listNotebooks(session.cookies)
      return new Response(JSON.stringify({ notebooks }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'query') {
      const notebookId = body.notebook_id || session.notebook_id
      if (!notebookId) {
        return new Response(JSON.stringify({ error: 'notebook_id is required' }), { 
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }
      if (!body.query) {
        return new Response(JSON.stringify({ error: 'query is required' }), { 
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      const answer = await queryNotebook(session.cookies, notebookId, body.query)
      return new Response(JSON.stringify({ answer }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { 
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error: unknown) {
    console.error('NotebookLM proxy error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), { 
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})

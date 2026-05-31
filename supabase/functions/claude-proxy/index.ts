/**
 * Claude Proxy (SEC-006)
 *
 * Server-side proxy for api.anthropic.com so the Anthropic API key does not
 * ship in the React Native bundle. Verifies the caller's Supabase JWT, then
 * forwards the request body to Claude and returns the response verbatim.
 *
 * Request body:  Anthropic Messages API payload (model, system, messages, tools, …)
 * Response body: Anthropic Messages API response (content, stop_reason, …)
 *
 * Vision (image content blocks) and tool-use payloads pass through unchanged.
 * Streaming (SSE) is not used by the client today; if added later, this proxy
 * must switch to a streaming response body.
 *
 * TODO(SEC-007): per-user rate limiting.
 * TODO(SEC-006): integrate authoritative token accounting via tokenService.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { authenticateRequest, isAuthFailure } from '../_shared/auth.ts';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_API_VERSION = '2023-06-01';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const auth = await authenticateRequest(req, corsHeaders);
    if (isAuthFailure(auth)) return auth.response;

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY') || '';
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Claude proxy not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const payload = await req.json();

    const upstream = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': CLAUDE_API_VERSION,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await upstream.text();
    return new Response(responseText, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
      },
    });
  } catch (err) {
    console.error('claude-proxy error:', (err as Error)?.name, (err as Error)?.stack);
    return new Response(
      JSON.stringify({ error: 'Claude proxy failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

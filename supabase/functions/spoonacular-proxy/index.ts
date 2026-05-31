/**
 * Spoonacular Proxy (SEC-006)
 *
 * Server-side proxy for api.spoonacular.com so the API key does not ship in
 * the React Native bundle. Verifies the caller's Supabase JWT, then calls
 * Spoonacular and returns the JSON response verbatim.
 *
 * Request body:
 *   {
 *     endpoint: 'findByIngredients' | 'complexSearch' | 'recipeInformation',
 *     params: Record<string, string | number | boolean>,
 *     id?: number,   // only for 'recipeInformation'
 *   }
 *
 * The proxy whitelists endpoints to prevent abuse of the upstream API key.
 *
 * TODO(SEC-007): per-user rate limiting.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { authenticateRequest, isAuthFailure } from '../_shared/auth.ts';

const BASE_URL = 'https://api.spoonacular.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type SpoonacularEndpoint = 'findByIngredients' | 'complexSearch' | 'recipeInformation';

interface ProxyRequest {
  endpoint: SpoonacularEndpoint;
  params?: Record<string, string | number | boolean>;
  id?: number;
}

function buildUpstreamUrl(
  endpoint: SpoonacularEndpoint,
  apiKey: string,
  params: Record<string, string | number | boolean>,
  id?: number,
): string | null {
  const usp = new URLSearchParams();
  usp.set('apiKey', apiKey);
  for (const [k, v] of Object.entries(params)) {
    usp.set(k, String(v));
  }

  switch (endpoint) {
    case 'findByIngredients':
      return `${BASE_URL}/recipes/findByIngredients?${usp.toString()}`;
    case 'complexSearch':
      return `${BASE_URL}/recipes/complexSearch?${usp.toString()}`;
    case 'recipeInformation':
      if (typeof id !== 'number' || !Number.isFinite(id)) return null;
      return `${BASE_URL}/recipes/${id}/information?${usp.toString()}`;
    default:
      return null;
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const auth = await authenticateRequest(req, corsHeaders);
    if (isAuthFailure(auth)) return auth.response;

    const apiKey = Deno.env.get('SPOONACULAR_API_KEY') || '';
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Spoonacular proxy not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = (await req.json()) as ProxyRequest;
    const params = body?.params ?? {};
    const url = buildUpstreamUrl(body?.endpoint, apiKey, params, body?.id);
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'Invalid endpoint or missing id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const upstream = await fetch(url);
    const responseText = await upstream.text();
    return new Response(responseText, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
      },
    });
  } catch (err) {
    console.error('spoonacular-proxy error:', (err as Error)?.name, (err as Error)?.stack);
    return new Response(
      JSON.stringify({ error: 'Spoonacular proxy failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

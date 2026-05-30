/**
 * Shared JWT authentication for Supabase edge functions.
 *
 * Even though `verify_jwt = true` in supabase/config.toml lets the gateway
 * reject requests without a valid JWT, protected functions still need the
 * authenticated user's ID to act on their behalf. Trusting a `userId` from
 * the request body lets any signed-in user impersonate any other user
 * (SEC-001). Instead, derive the user from the verified token claim.
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface AuthenticatedUser {
  userId: string;
  email: string | null;
}

export interface AuthFailure {
  response: Response;
}

/**
 * Extract the bearer token from the Authorization header, verify it against
 * Supabase Auth, and return the authenticated user. On any failure returns a
 * pre-built 401 Response so the caller can `return` it directly.
 *
 * Callers pass the cors headers they would have applied so the 401 response
 * is browser-compatible.
 */
export async function authenticateRequest(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<AuthenticatedUser | AuthFailure> {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : null;

  if (!token) {
    return {
      response: new Response(
        JSON.stringify({ error: 'Unauthorized: missing bearer token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      ),
    };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

  // Use the anon key for the auth check — verifying a JWT does not require
  // service-role privileges, and a misconfigured function that only has the
  // service-role key should still be able to verify callers.
  const authClient: SupabaseClient = createClient(
    supabaseUrl,
    supabaseAnonKey || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  );

  const { data, error } = await authClient.auth.getUser(token);

  if (error || !data?.user?.id) {
    return {
      response: new Response(
        JSON.stringify({ error: 'Unauthorized: invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      ),
    };
  }

  return { userId: data.user.id, email: data.user.email ?? null };
}

export function isAuthFailure(
  result: AuthenticatedUser | AuthFailure,
): result is AuthFailure {
  return (result as AuthFailure).response !== undefined;
}

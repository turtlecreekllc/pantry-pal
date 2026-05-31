/**
 * OpenAI Audio Proxy (SEC-006)
 *
 * Server-side proxy for OpenAI's TTS (tts-1) and STT (whisper-1) endpoints
 * so the OpenAI API key does not ship in the React Native bundle. Verifies
 * the caller's Supabase JWT, then forwards to OpenAI.
 *
 * Request body (JSON, op-discriminated):
 *
 *   { op: 'tts', text, voice?, model?, response_format?, speed? }
 *     -> Returns { audioBase64, mimeType } so the client can write to disk.
 *
 *   { op: 'stt', audioBase64, filename?, mimeType?, model?, language? }
 *     -> Returns the OpenAI transcription response verbatim ({ text, … }).
 *
 * The audio is base64-encoded on the wire to keep the proxy boundary
 * uniformly JSON. The VoiceAssistantModal already writes/reads base64 audio
 * files via expo-file-system, so this is consistent with existing flow.
 *
 * TODO(SEC-007): per-user rate limiting.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { authenticateRequest, isAuthFailure } from '../_shared/auth.ts';

const TTS_URL = 'https://api.openai.com/v1/audio/speech';
const STT_URL = 'https://api.openai.com/v1/audio/transcriptions';

const DEFAULT_TTS_MODEL = 'tts-1';
const DEFAULT_TTS_VOICE = 'nova';
const DEFAULT_TTS_FORMAT = 'mp3';
const DEFAULT_STT_MODEL = 'whisper-1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TtsRequest {
  op: 'tts';
  text: string;
  voice?: string;
  model?: string;
  response_format?: string;
  speed?: number;
}

interface SttRequest {
  op: 'stt';
  audioBase64: string;
  filename?: string;
  mimeType?: string;
  model?: string;
  language?: string;
}

type ProxyRequest = TtsRequest | SttRequest;

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  // Chunk to avoid blowing the stack on large audio (~minutes of mp3).
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const auth = await authenticateRequest(req, corsHeaders);
    if (isAuthFailure(auth)) return auth.response;

    const apiKey = Deno.env.get('OPENAI_API_KEY') || '';
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI audio proxy not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = (await req.json()) as ProxyRequest;

    if (body?.op === 'tts') {
      const upstream = await fetch(TTS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: body.model ?? DEFAULT_TTS_MODEL,
          input: body.text,
          voice: body.voice ?? DEFAULT_TTS_VOICE,
          response_format: body.response_format ?? DEFAULT_TTS_FORMAT,
          speed: body.speed ?? 1.0,
        }),
      });

      if (!upstream.ok) {
        const errorText = await upstream.text().catch(() => '');
        console.error('openai-audio-proxy tts upstream error:', upstream.status, errorText.slice(0, 200));
        return new Response(
          JSON.stringify({ error: 'OpenAI TTS request failed', status: upstream.status }),
          { status: upstream.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const buf = await upstream.arrayBuffer();
      const audioBase64 = bufferToBase64(buf);
      const mimeType = upstream.headers.get('content-type') ?? 'audio/mpeg';

      return new Response(
        JSON.stringify({ audioBase64, mimeType }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (body?.op === 'stt') {
      const audioBytes = base64ToBytes(body.audioBase64);
      const mimeType = body.mimeType ?? 'audio/m4a';
      const filename = body.filename ?? 'recording.m4a';

      const form = new FormData();
      form.append('file', new Blob([audioBytes], { type: mimeType }), filename);
      form.append('model', body.model ?? DEFAULT_STT_MODEL);
      if (body.language) form.append('language', body.language);

      const upstream = await fetch(STT_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });

      const responseText = await upstream.text();
      return new Response(responseText, {
        status: upstream.status,
        headers: {
          ...corsHeaders,
          'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
        },
      });
    }

    return new Response(
      JSON.stringify({ error: 'Unknown op; expected "tts" or "stt"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('openai-audio-proxy error:', (err as Error)?.name, (err as Error)?.stack);
    return new Response(
      JSON.stringify({ error: 'OpenAI audio proxy failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

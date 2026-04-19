/**
 * Shared Claude API client for Dinner Plans.
 *
 * All AI calls (except OpenAI audio: TTS tts-1 and STT whisper-1) go through here.
 * Uses raw fetch() consistent with the existing codebase pattern — no npm SDK needed.
 *
 * Data flow:
 *   callers (tonightService, aiRecipeGenerator, chatService, etc.)
 *     └─→ callClaude / callClaudeVision / callClaudeWithTools
 *           └─→ POST https://api.anthropic.com/v1/messages
 *                 └─→ Claude claude-sonnet-4-6
 */

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-6';
const CLAUDE_API_VERSION = '2023-06-01';
const DEFAULT_MAX_TOKENS = 2048;
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

const getAnthropicKey = (): string => {
  const key = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!key || key === 'your-anthropic-api-key-here') {
    throw new ClaudeError('EXPO_PUBLIC_ANTHROPIC_API_KEY is not configured', 0);
  }
  return key;
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | ClaudeContentBlock[];
}

export type ClaudeContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: ClaudeImageSource }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string };

export interface ClaudeImageSource {
  type: 'base64';
  media_type: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
  data: string;
}

export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ClaudeToolResult {
  text: string;
  toolCalls: Array<{ name: string; input: Record<string, unknown>; result: string }>;
  stopReason: string;
}

export class ClaudeError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'ClaudeError';
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isRetryable(status: number): boolean {
  return status === 429 || status === 500 || status === 529;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ClaudeError('Claude API request timed out after 30s', 0);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function callClaudeAPI(body: Record<string, unknown>): Promise<unknown> {
  const key = getAnthropicKey();
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': key,
    'anthropic-version': CLAUDE_API_VERSION,
  };

  let lastError: ClaudeError | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 1s, 2s
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }

    const response = await fetchWithTimeout(
      CLAUDE_API_URL,
      { method: 'POST', headers, body: JSON.stringify(body) },
      DEFAULT_TIMEOUT_MS
    );

    if (response.ok) {
      return response.json();
    }

    const errorText = await response.text().catch(() => 'Unknown error');
    lastError = new ClaudeError(
      `Claude API error ${response.status}: ${errorText}`,
      response.status,
      isRetryable(response.status)
    );

    if (!lastError.retryable || attempt === MAX_RETRIES) {
      throw lastError;
    }
  }

  throw lastError!;
}

function extractText(data: unknown): string {
  const d = data as { content?: Array<{ type: string; text?: string }> };
  const block = d?.content?.find(b => b.type === 'text');
  if (!block || block.text === undefined) {
    throw new ClaudeError('Claude returned no text content', 0);
  }
  return block.text;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Simple text-in, text-out Claude call.
 * Use for recipe generation, recipe import, support chat, voice command parsing.
 */
export async function callClaude(
  system: string,
  messages: ClaudeMessage[],
  opts: { maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  const data = await callClaudeAPI({
    model: CLAUDE_MODEL,
    max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
    temperature: opts.temperature ?? 0.7,
    system,
    messages,
  });
  return extractText(data);
}

/**
 * Vision call — sends a base64 image alongside a text prompt.
 * Use for receipt scanning, shelf scanning, recipe card scanning, photo import.
 *
 * IMPORTANT: Compress images to <2MB before calling (expo-image-manipulator).
 * Claude has a 5MB limit; modern phone photos regularly exceed this.
 */
export async function callClaudeVision(
  system: string,
  imageBase64: string,
  mediaType: ClaudeImageSource['media_type'] = 'image/jpeg',
  prompt = 'Analyze this image and respond as instructed.'
): Promise<string> {
  const messages: ClaudeMessage[] = [
    {
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: imageBase64 },
        },
        { type: 'text', text: prompt },
      ],
    },
  ];

  const data = await callClaudeAPI({
    model: CLAUDE_MODEL,
    max_tokens: DEFAULT_MAX_TOKENS,
    temperature: 0.1,
    system,
    messages,
  });
  return extractText(data);
}

/**
 * Tool-use call — Claude can invoke defined tools and we execute them.
 * Use for the Pepper chat assistant (get_pantry_items, search_recipes, etc.).
 *
 * Runs the tool-use loop for up to 5 iterations.
 *
 *   Claude returns tool_use block
 *     → caller executes the tool
 *     → result fed back as tool_result
 *     → Claude continues or returns final text
 */
export async function callClaudeWithTools(
  system: string,
  tools: ClaudeTool[],
  initialMessages: ClaudeMessage[],
  toolExecutor: (name: string, input: Record<string, unknown>) => Promise<string>
): Promise<ClaudeToolResult> {
  const messages: ClaudeMessage[] = [...initialMessages];
  const toolCalls: ClaudeToolResult['toolCalls'] = [];
  const MAX_TOOL_ITERATIONS = 5;

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const data = await callClaudeAPI({
      model: CLAUDE_MODEL,
      max_tokens: DEFAULT_MAX_TOKENS,
      temperature: 0.7,
      system,
      tools,
      tool_choice: { type: 'auto' },
      messages,
    }) as {
      content: ClaudeContentBlock[];
      stop_reason: string;
    };

    const { content, stop_reason } = data;

    // Collect any text from this response
    const textBlocks = content.filter(b => b.type === 'text') as Array<{ type: 'text'; text: string }>;
    const responseText = textBlocks.map(b => b.text).join('');

    // If no tool calls, we're done
    const toolUseBlocks = content.filter(b => b.type === 'tool_use') as Array<{
      type: 'tool_use';
      id: string;
      name: string;
      input: Record<string, unknown>;
    }>;

    if (toolUseBlocks.length === 0 || stop_reason === 'end_turn') {
      return { text: responseText, toolCalls, stopReason: stop_reason };
    }

    // Add Claude's response (with tool_use blocks) to message history
    messages.push({ role: 'assistant', content });

    // Execute each tool and collect results
    const toolResults: ClaudeContentBlock[] = [];
    for (const toolUse of toolUseBlocks) {
      let result: string;
      try {
        result = await toolExecutor(toolUse.name, toolUse.input);
      } catch (err) {
        result = `Error executing tool ${toolUse.name}: ${err instanceof Error ? err.message : String(err)}`;
      }
      toolCalls.push({ name: toolUse.name, input: toolUse.input, result });
      toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: result });
    }

    // Feed results back to Claude
    messages.push({ role: 'user', content: toolResults });
  }

  // Max iterations reached — return whatever we have
  return { text: '', toolCalls, stopReason: 'max_iterations' };
}

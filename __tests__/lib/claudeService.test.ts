/**
 * Tests for lib/claudeService.ts
 *
 * All tests mock global fetch — Claude API is never called for real.
 */

// Set env before module import so getAnthropicKey() sees it at module load time
process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = 'test-key-abc123';

import { callClaude, callClaudeVision, callClaudeWithTools, ClaudeError } from '../../lib/claudeService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSuccessResponse(text: string) {
  return {
    ok: true,
    json: async () => ({
      content: [{ type: 'text', text }],
      stop_reason: 'end_turn',
    }),
    text: async () => text,
  };
}

function makeErrorResponse(status: number, body = 'error') {
  return {
    ok: false,
    status,
    json: async () => ({}),
    text: async () => body,
  };
}

beforeEach(() => {
  jest.resetAllMocks();
  process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = 'test-key-abc123';
});

// ---------------------------------------------------------------------------
// callClaude
// ---------------------------------------------------------------------------

describe('callClaude', () => {
  it('sends correct headers and returns text content', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(makeSuccessResponse('Hello world'));

    const result = await callClaude('You are a chef', [{ role: 'user', content: 'suggest dinner' }]);

    expect(result).toBe('Hello world');
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    const body = JSON.parse(opts.body);
    expect(body.model).toBe('claude-sonnet-4-6');
    expect(body.system).toBe('You are a chef');
    expect(opts.headers['x-api-key']).toBe('test-key-abc123');
    expect(opts.headers['anthropic-version']).toBe('2023-06-01');
  });

  it('throws ClaudeError when API key is missing', async () => {
    delete process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
    await expect(callClaude('system', [{ role: 'user', content: 'hi' }])).rejects.toThrow('not configured');
  });

  it('throws ClaudeError when API key is placeholder', async () => {
    process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = 'your-anthropic-api-key-here';
    await expect(callClaude('system', [{ role: 'user', content: 'hi' }])).rejects.toThrow(ClaudeError);
  });

  it('retries on 429 and succeeds on second attempt', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(makeErrorResponse(429, 'rate limited'))
      .mockResolvedValueOnce(makeSuccessResponse('retry worked'));

    jest.spyOn(global, 'setTimeout').mockImplementation((cb: TimerHandler) => {
      (cb as () => void)();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    const result = await callClaude('system', [{ role: 'user', content: 'hi' }]);
    expect(result).toBe('retry worked');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('retries on 500 and throws after max retries', async () => {
    global.fetch = jest.fn().mockResolvedValue(makeErrorResponse(500, 'server error'));

    jest.spyOn(global, 'setTimeout').mockImplementation((cb: TimerHandler) => {
      (cb as () => void)();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    await expect(callClaude('system', [{ role: 'user', content: 'hi' }])).rejects.toThrow(ClaudeError);
    // 1 initial + 2 retries = 3 calls
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('does not retry on 400 (non-retryable)', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(makeErrorResponse(400, 'bad request'));
    await expect(callClaude('system', [{ role: 'user', content: 'hi' }])).rejects.toThrow(ClaudeError);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('throws on timeout (AbortError)', async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    await expect(callClaude('system', [{ role: 'user', content: 'hi' }])).rejects.toThrow('timed out');
  });
});

// ---------------------------------------------------------------------------
// callClaudeVision
// ---------------------------------------------------------------------------

describe('callClaudeVision', () => {
  it('sends image as base64 content block with correct media type', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(makeSuccessResponse('found 3 items'));

    const result = await callClaudeVision('Analyze this image', 'base64imagedata==', 'image/jpeg');

    expect(result).toBe('found 3 items');
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    const imageBlock = body.messages[0].content[0];
    expect(imageBlock.type).toBe('image');
    expect(imageBlock.source.type).toBe('base64');
    expect(imageBlock.source.media_type).toBe('image/jpeg');
    expect(imageBlock.source.data).toBe('base64imagedata==');
  });

  it('defaults to image/jpeg media type', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(makeSuccessResponse('ok'));
    await callClaudeVision('system', 'data');
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.messages[0].content[0].source.media_type).toBe('image/jpeg');
  });
});

// ---------------------------------------------------------------------------
// callClaudeWithTools
// ---------------------------------------------------------------------------

describe('callClaudeWithTools', () => {
  const tools = [
    {
      name: 'get_pantry_items',
      description: 'Get pantry items',
      input_schema: { type: 'object' as const, properties: {} },
    },
  ];

  it('returns text when Claude does not call any tools', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(makeSuccessResponse('No tools needed, here is your answer.'));

    const toolExecutor = jest.fn();
    const result = await callClaudeWithTools(
      'You are Pepper',
      tools,
      [{ role: 'user', content: 'What is in my pantry?' }],
      toolExecutor
    );

    expect(result.text).toBe('No tools needed, here is your answer.');
    expect(result.toolCalls).toHaveLength(0);
    expect(toolExecutor).not.toHaveBeenCalled();
  });

  it('executes a tool call and feeds result back to Claude', async () => {
    // First call: Claude requests a tool
    const toolUseResponse = {
      ok: true,
      json: async () => ({
        content: [
          { type: 'tool_use', id: 'tool-123', name: 'get_pantry_items', input: { location: 'fridge' } },
        ],
        stop_reason: 'tool_use',
      }),
      text: async () => '',
    };
    // Second call: Claude responds with text after tool result
    const finalResponse = makeSuccessResponse('You have eggs and milk in your fridge.');

    global.fetch = jest.fn()
      .mockResolvedValueOnce(toolUseResponse)
      .mockResolvedValueOnce(finalResponse);

    const toolExecutor = jest.fn().mockResolvedValue(JSON.stringify([{ name: 'Eggs' }, { name: 'Milk' }]));

    const result = await callClaudeWithTools(
      'You are Pepper',
      tools,
      [{ role: 'user', content: 'What is in my fridge?' }],
      toolExecutor
    );

    expect(toolExecutor).toHaveBeenCalledWith('get_pantry_items', { location: 'fridge' });
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].name).toBe('get_pantry_items');
    expect(result.text).toBe('You have eggs and milk in your fridge.');
  });

  it('handles tool executor errors gracefully', async () => {
    const toolUseResponse = {
      ok: true,
      json: async () => ({
        content: [{ type: 'tool_use', id: 'tool-456', name: 'get_pantry_items', input: {} }],
        stop_reason: 'tool_use',
      }),
      text: async () => '',
    };
    global.fetch = jest.fn()
      .mockResolvedValueOnce(toolUseResponse)
      .mockResolvedValueOnce(makeSuccessResponse('I could not get pantry data.'));

    const toolExecutor = jest.fn().mockRejectedValue(new Error('DB connection failed'));

    const result = await callClaudeWithTools('system', tools, [{ role: 'user', content: 'hi' }], toolExecutor);

    expect(result.toolCalls[0].result).toContain('Error executing tool');
  });
});

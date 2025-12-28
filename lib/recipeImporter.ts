import {
  ImportedRecipe,
  ImportPlatform,
  RecipeImportResult,
  RecipeIngredient,
} from './types';

// Get API key from environment
const getOpenAIKey = (): string => {
  const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!key) {
    throw new Error('EXPO_PUBLIC_OPENAI_API_KEY is not configured. Please add it to your .env file.');
  }
  return key;
};

// Platform detection patterns
const PLATFORM_PATTERNS: Record<ImportPlatform, RegExp[]> = {
  instagram: [
    /instagram\.com/i,
    /instagr\.am/i,
  ],
  tiktok: [
    /tiktok\.com/i,
    /vm\.tiktok\.com/i,
  ],
  youtube: [
    /youtube\.com/i,
    /youtu\.be/i,
  ],
  pinterest: [
    /pinterest\.com/i,
    /pin\.it/i,
  ],
  facebook: [
    /facebook\.com/i,
    /fb\.com/i,
    /fb\.watch/i,
  ],
  web: [], // Default fallback
  text: [], // Manual text entry
  photo: [], // Photo OCR
  recipe_card: [], // Scanned recipe card
};

/**
 * Detect the platform from a URL
 */
export function detectPlatform(url: string): ImportPlatform {
  for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(url)) {
        return platform as ImportPlatform;
      }
    }
  }
  return 'web';
}

/**
 * Validate a URL
 */
export function isValidUrl(string: string): boolean {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// AI Prompts for recipe extraction
const URL_EXTRACTION_PROMPT = `You are a recipe extraction expert. Analyze the webpage content and extract the recipe information.

Extract the following fields:
- title: The recipe name (required)
- description: Brief description of the dish
- ingredients: Array of objects with {ingredient: string, measure: string}
- instructions: Full cooking instructions as a single text block with numbered steps
- prepTime: Preparation time in minutes (number only)
- cookTime: Cooking time in minutes (number only)
- totalTime: Total time in minutes (number only)
- servings: Number of servings (number only)
- cuisine: The cuisine type (e.g., Italian, Mexican, Asian)
- category: Meal category (e.g., Dinner, Breakfast, Dessert)
- difficulty: One of "easy", "medium", or "hard"
- diets: Array of dietary tags (e.g., ["Vegetarian", "Gluten-Free"])
- imageUrl: URL of the recipe image if found

IMPORTANT RULES:
- Skip blog intros, personal stories, and ads - focus ONLY on the recipe
- For ingredients, separate the measurement from the ingredient name
- If times aren't specified, estimate based on the recipe complexity
- Be conservative with dietary tags - only include if explicitly stated or clearly implied
- Return valid JSON only, no markdown or explanation

Respond with this exact JSON structure:
{
  "title": "...",
  "description": "...",
  "ingredients": [{"ingredient": "...", "measure": "..."}],
  "instructions": "1. First step...\\n2. Second step...",
  "prepTime": 15,
  "cookTime": 30,
  "totalTime": 45,
  "servings": 4,
  "cuisine": "...",
  "category": "...",
  "difficulty": "easy|medium|hard",
  "diets": [],
  "imageUrl": "..."
}`;

const TEXT_EXTRACTION_PROMPT = `You are a recipe extraction expert. Parse the following text and extract recipe information.
The text may be copied from social media, a message, notes, or any free-form source.

Extract the following fields:
- title: The recipe name (required - infer from context if not explicit)
- description: Brief description of the dish
- ingredients: Array of objects with {ingredient: string, measure: string}
- instructions: Full cooking instructions as a single text block with numbered steps
- prepTime: Preparation time in minutes (number only, estimate if not specified)
- cookTime: Cooking time in minutes (number only, estimate if not specified)
- totalTime: Total time in minutes (number only)
- servings: Number of servings (number only, default to 4 if not specified)
- cuisine: The cuisine type (infer from ingredients/techniques)
- category: Meal category (e.g., Dinner, Breakfast, Dessert)
- difficulty: One of "easy", "medium", or "hard"
- diets: Array of dietary tags if applicable

IMPORTANT RULES:
- Parse even informal or abbreviated recipes
- For ingredients without measurements, use reasonable defaults or "to taste"
- If instructions are brief, expand them into clear steps
- Return valid JSON only, no markdown or explanation

Respond with this exact JSON structure:
{
  "title": "...",
  "description": "...",
  "ingredients": [{"ingredient": "...", "measure": "..."}],
  "instructions": "1. First step...\\n2. Second step...",
  "prepTime": 15,
  "cookTime": 30,
  "totalTime": 45,
  "servings": 4,
  "cuisine": "...",
  "category": "...",
  "difficulty": "easy|medium|hard",
  "diets": []
}`;

const PHOTO_OCR_PROMPT = `You are a recipe extraction expert. This image contains a recipe (printed, handwritten, or from a cookbook/magazine).

Extract all recipe information you can read:
- title: The recipe name
- description: Brief description if visible
- ingredients: Array of objects with {ingredient: string, measure: string}
- instructions: Full cooking instructions as a single text block with numbered steps
- prepTime: Preparation time in minutes if visible
- cookTime: Cooking time in minutes if visible
- totalTime: Total time in minutes if visible
- servings: Number of servings if visible
- cuisine: The cuisine type if identifiable
- category: Meal category if identifiable
- difficulty: One of "easy", "medium", or "hard" based on complexity

IMPORTANT RULES:
- Read all text carefully, including handwritten notes
- If text is partially obscured, make reasonable inferences
- For ingredients, separate measurements from ingredient names
- Include any tips or variations mentioned
- Return valid JSON only, no markdown or explanation

Respond with this exact JSON structure:
{
  "title": "...",
  "description": "...",
  "ingredients": [{"ingredient": "...", "measure": "..."}],
  "instructions": "1. First step...\\n2. Second step...",
  "prepTime": null,
  "cookTime": null,
  "totalTime": null,
  "servings": null,
  "cuisine": null,
  "category": null,
  "difficulty": null,
  "diets": []
}`;

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  error?: {
    message: string;
  };
}

/**
 * Retry wrapper for network requests with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on API key errors or invalid requests
      const errorMessage = lastError.message.toLowerCase();
      if (
        errorMessage.includes('api key') ||
        errorMessage.includes('401') ||
        errorMessage.includes('400') ||
        errorMessage.includes('invalid') ||
        errorMessage.includes('configured')
      ) {
        throw lastError;
      }

      // Only retry on network/timeout errors
      if (attempt < maxRetries) {
        const delay = initialDelayMs * Math.pow(2, attempt - 1);
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Request failed after retries');
}

interface ExtractedRecipeData {
  title: string;
  description?: string;
  ingredients: Array<{ ingredient: string; measure: string }>;
  instructions: string;
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  servings?: number;
  cuisine?: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  diets?: string[];
  imageUrl?: string;
}

/**
 * Call OpenAI API for text-based extraction
 */
async function callOpenAIText(prompt: string, content: string): Promise<string> {
  const apiKey = getOpenAIKey();

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content },
      ],
      max_tokens: 3000,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `OpenAI API error: ${response.status} - ${(errorData as OpenAIResponse).error?.message || response.statusText}`
    );
  }

  const data: OpenAIResponse = await response.json();

  if (!data.choices?.[0]?.message?.content) {
    throw new Error('Invalid response from OpenAI API');
  }

  return data.choices[0].message.content;
}

/**
 * Call OpenAI Vision API for image-based extraction
 */
async function callOpenAIVision(imageBase64: string): Promise<string> {
  const apiKey = getOpenAIKey();

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PHOTO_OCR_PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 3000,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `OpenAI API error: ${response.status} - ${(errorData as OpenAIResponse).error?.message || response.statusText}`
    );
  }

  const data: OpenAIResponse = await response.json();

  if (!data.choices?.[0]?.message?.content) {
    throw new Error('Invalid response from OpenAI API');
  }

  return data.choices[0].message.content;
}

/**
 * Parse JSON response from AI, handling markdown code blocks
 */
function parseJSONResponse<T>(content: string): T {
  let cleaned = content.trim();

  // Remove markdown code blocks if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Failed to parse AI response:', content);
    throw new Error('Failed to parse recipe data from AI response');
  }
}

/**
 * Convert extracted data to ImportedRecipe format
 */
function toImportedRecipe(
  data: ExtractedRecipeData,
  platform: ImportPlatform,
  sourceUrl?: string
): Partial<ImportedRecipe> {
  const ingredients: RecipeIngredient[] = data.ingredients.map((ing) => ({
    ingredient: ing.ingredient.trim(),
    measure: ing.measure?.trim() || '',
  }));

  return {
    source_url: sourceUrl || null,
    source_platform: platform,
    title: data.title,
    description: data.description || null,
    image_url: data.imageUrl || null,
    prep_time: data.prepTime || null,
    cook_time: data.cookTime || null,
    total_time: data.totalTime || data.prepTime && data.cookTime
      ? (data.prepTime || 0) + (data.cookTime || 0)
      : null,
    servings: data.servings || null,
    ingredients,
    instructions: data.instructions,
    cuisine: data.cuisine || null,
    category: data.category || null,
    difficulty: data.difficulty || null,
    diets: data.diets || [],
    tags: [],
    nutrition: null,
    import_metadata: {
      extractedAt: new Date().toISOString(),
      platform,
      sourceUrl,
    },
  };
}

/**
 * Calculate confidence score based on extracted data completeness
 */
function calculateConfidence(data: ExtractedRecipeData): number {
  let score = 0;
  const weights = {
    title: 0.2,
    ingredients: 0.3,
    instructions: 0.3,
    times: 0.1,
    metadata: 0.1,
  };

  // Title is present
  if (data.title && data.title.length > 2) {
    score += weights.title;
  }

  // Ingredients are present and reasonable
  if (data.ingredients && data.ingredients.length >= 2) {
    const validIngredients = data.ingredients.filter(
      (i) => i.ingredient && i.ingredient.length > 1
    );
    score += weights.ingredients * Math.min(validIngredients.length / data.ingredients.length, 1);
  }

  // Instructions are present and substantial
  if (data.instructions && data.instructions.length > 50) {
    score += weights.instructions;
  } else if (data.instructions && data.instructions.length > 20) {
    score += weights.instructions * 0.5;
  }

  // Times are specified
  if (data.prepTime || data.cookTime || data.totalTime) {
    score += weights.times;
  }

  // Metadata is present
  if (data.cuisine || data.category || data.servings) {
    score += weights.metadata;
  }

  return Math.round(score * 100) / 100;
}

/**
 * Fetch webpage content and extract text
 */
async function fetchWebpageContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PantryPal/1.0; Recipe Importer)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();

    // Try to extract JSON-LD recipe schema first (most reliable)
    const jsonLdRecipe = extractJsonLdRecipe(html);
    if (jsonLdRecipe) {
      return `[STRUCTURED RECIPE DATA]\n${JSON.stringify(jsonLdRecipe, null, 2)}`;
    }

    // Fall back to extracting text content
    return extractTextFromHtml(html);
  } catch (error) {
    console.error('Error fetching webpage:', error);
    throw new Error(`Failed to fetch recipe from URL: ${(error as Error).message}`);
  }
}

/**
 * Extract JSON-LD recipe schema from HTML
 */
function extractJsonLdRecipe(html: string): unknown | null {
  try {
    // Find all script tags with type application/ld+json
    const ldJsonRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;

    while ((match = ldJsonRegex.exec(html)) !== null) {
      try {
        const jsonData = JSON.parse(match[1]);

        // Handle array of schemas
        const schemas = Array.isArray(jsonData) ? jsonData : [jsonData];

        for (const schema of schemas) {
          // Check if this is a Recipe schema
          if (schema['@type'] === 'Recipe') {
            return schema;
          }
          // Check nested @graph
          if (schema['@graph']) {
            const recipe = schema['@graph'].find(
              (item: { '@type': string }) => item['@type'] === 'Recipe'
            );
            if (recipe) return recipe;
          }
        }
      } catch {
        // Invalid JSON, continue to next script tag
      }
    }
  } catch (error) {
    console.error('Error extracting JSON-LD:', error);
  }
  return null;
}

/**
 * Extract readable text from HTML (basic implementation)
 */
function extractTextFromHtml(html: string): string {
  // Remove scripts, styles, and other non-content elements
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Replace common block elements with newlines
  text = text
    .replace(/<\/?(p|div|br|li|h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Clean up whitespace
  text = text
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();

  // Limit content length for API
  if (text.length > 15000) {
    text = text.substring(0, 15000) + '\n[Content truncated]';
  }

  return text;
}

/**
 * Import a recipe from a URL
 */
export async function importFromUrl(url: string): Promise<RecipeImportResult> {
  if (!isValidUrl(url)) {
    return {
      success: false,
      recipe: null,
      error: 'Invalid URL provided',
      confidence: 0,
      platform: 'web',
    };
  }

  const platform = detectPlatform(url);

  try {
    const content = await withRetry(() => fetchWebpageContent(url), 2, 500);
    const aiResponse = await withRetry(() => callOpenAIText(URL_EXTRACTION_PROMPT, content));
    const extracted = parseJSONResponse<ExtractedRecipeData>(aiResponse);
    const confidence = calculateConfidence(extracted);
    const recipe = toImportedRecipe(extracted, platform, url);

    return {
      success: true,
      recipe,
      error: null,
      confidence,
      platform,
      warnings: confidence < 0.7 ? ['Some recipe details may be incomplete'] : undefined,
    };
  } catch (error) {
    console.error('Error importing from URL:', error);
    return {
      success: false,
      recipe: null,
      error: (error as Error).message,
      confidence: 0,
      platform,
    };
  }
}

/**
 * Import a recipe from pasted text
 */
export async function importFromText(text: string): Promise<RecipeImportResult> {
  if (!text || text.trim().length < 20) {
    return {
      success: false,
      recipe: null,
      error: 'Please provide more recipe content to import',
      confidence: 0,
      platform: 'text',
    };
  }

  try {
    const aiResponse = await withRetry(() => callOpenAIText(TEXT_EXTRACTION_PROMPT, text));
    const extracted = parseJSONResponse<ExtractedRecipeData>(aiResponse);
    const confidence = calculateConfidence(extracted);
    const recipe = toImportedRecipe(extracted, 'text');

    return {
      success: true,
      recipe,
      error: null,
      confidence,
      platform: 'text',
      warnings: confidence < 0.7 ? ['Some recipe details may be incomplete'] : undefined,
    };
  } catch (error) {
    console.error('Error importing from text:', error);
    return {
      success: false,
      recipe: null,
      error: (error as Error).message,
      confidence: 0,
      platform: 'text',
    };
  }
}

/**
 * Import a recipe from a photo (OCR)
 */
export async function importFromPhoto(imageBase64: string): Promise<RecipeImportResult> {
  if (!imageBase64 || imageBase64.length < 100) {
    return {
      success: false,
      recipe: null,
      error: 'Invalid image data provided',
      confidence: 0,
      platform: 'photo',
    };
  }

  try {
    const aiResponse = await withRetry(() => callOpenAIVision(imageBase64));
    const extracted = parseJSONResponse<ExtractedRecipeData>(aiResponse);
    const confidence = calculateConfidence(extracted);
    const recipe = toImportedRecipe(extracted, 'photo');

    return {
      success: true,
      recipe,
      error: null,
      confidence,
      platform: 'photo',
      warnings: confidence < 0.7 ? ['Some text may not have been readable'] : undefined,
    };
  } catch (error) {
    console.error('Error importing from photo:', error);
    return {
      success: false,
      recipe: null,
      error: (error as Error).message,
      confidence: 0,
      platform: 'photo',
    };
  }
}

/**
 * Get platform display name
 */
export function getPlatformDisplayName(platform: ImportPlatform): string {
  const names: Record<ImportPlatform, string> = {
    instagram: 'Instagram',
    tiktok: 'TikTok',
    youtube: 'YouTube',
    pinterest: 'Pinterest',
    facebook: 'Facebook',
    web: 'Website',
    text: 'Text',
    photo: 'Photo',
    recipe_card: 'Recipe Card',
  };
  return names[platform];
}

/**
 * Get platform icon name (for Ionicons)
 */
export function getPlatformIcon(platform: ImportPlatform): string {
  const icons: Record<ImportPlatform, string> = {
    instagram: 'logo-instagram',
    tiktok: 'musical-notes',
    youtube: 'logo-youtube',
    pinterest: 'logo-pinterest',
    facebook: 'logo-facebook',
    web: 'globe-outline',
    text: 'document-text-outline',
    photo: 'camera-outline',
    recipe_card: 'document-outline',
  };
  return icons[platform];
}

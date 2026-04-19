import {
  ImportedRecipe,
  ImportPlatform,
  RecipeImportResult,
  RecipeIngredient,
} from './types';
import { callClaude, callClaudeVision } from './claudeService';
import { compressImageForClaude } from './imageUtils';

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

async function callOpenAIText(prompt: string, content: string): Promise<string> {
  return callClaude(prompt, [{ role: 'user', content }], { maxTokens: 3000, temperature: 0.1 });
}

async function callOpenAIVision(imageBase64: string): Promise<string> {
  const compressed = await compressImageForClaude(imageBase64);
  return callClaudeVision(PHOTO_OCR_PROMPT, compressed, 'image/jpeg');
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

interface WebpageContent {
  content: string;
  extractedImageUrl: string | null;
}

/**
 * Extract image URL from various sources in HTML
 */
function extractImageFromHtml(html: string): string | null {
  // 1. Try Open Graph image (most common for recipe sites)
  const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  if (ogImageMatch?.[1]) {
    return ogImageMatch[1];
  }
  // 2. Try Twitter Card image
  const twitterImageMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
  if (twitterImageMatch?.[1]) {
    return twitterImageMatch[1];
  }
  // 3. Try schema.org image in meta tag
  const schemaImageMatch = html.match(/<meta[^>]*itemprop=["']image["'][^>]*content=["']([^"']+)["']/i);
  if (schemaImageMatch?.[1]) {
    return schemaImageMatch[1];
  }
  // 4. Try to find a large image in the content area (likely the recipe photo)
  const imgMatches = html.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi);
  if (imgMatches) {
    for (const imgTag of imgMatches) {
      const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
      const src = srcMatch?.[1];
      if (src && !src.includes('logo') && !src.includes('icon') && !src.includes('avatar') &&
          !src.includes('ad') && !src.includes('pixel') && !src.includes('tracking') &&
          (src.includes('recipe') || src.includes('dish') || src.includes('food') ||
           imgTag.includes('width') || imgTag.includes('recipe') || imgTag.includes('hero'))) {
        return src;
      }
    }
    // Fallback: return first large-looking image
    for (const imgTag of imgMatches.slice(0, 10)) {
      const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
      const src = srcMatch?.[1];
      if (src && (src.endsWith('.jpg') || src.endsWith('.jpeg') || src.endsWith('.png') || src.endsWith('.webp')) &&
          !src.includes('logo') && !src.includes('icon') && !src.includes('avatar')) {
        return src;
      }
    }
  }
  return null;
}

/**
 * Extract image URL from JSON-LD recipe schema
 */
function extractImageFromJsonLd(jsonLd: unknown): string | null {
  if (!jsonLd || typeof jsonLd !== 'object') return null;
  const schema = jsonLd as Record<string, unknown>;
  // image can be a string, array of strings, or ImageObject
  const image = schema.image;
  if (typeof image === 'string') {
    return image;
  }
  if (Array.isArray(image)) {
    const firstImage = image[0];
    if (typeof firstImage === 'string') return firstImage;
    if (firstImage && typeof firstImage === 'object') {
      const imgObj = firstImage as Record<string, unknown>;
      return (imgObj.url as string) || (imgObj.contentUrl as string) || null;
    }
  }
  if (image && typeof image === 'object') {
    const imgObj = image as Record<string, unknown>;
    return (imgObj.url as string) || (imgObj.contentUrl as string) || null;
  }
  return null;
}

/**
 * Fetch webpage content and extract text
 */
async function fetchWebpageContent(url: string): Promise<WebpageContent> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DinnerPlans/1.0; Recipe Importer)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }
    const html = await response.text();
    let extractedImageUrl: string | null = null;
    // Try to extract JSON-LD recipe schema first (most reliable)
    const jsonLdRecipe = extractJsonLdRecipe(html);
    if (jsonLdRecipe) {
      // Extract image from JSON-LD
      extractedImageUrl = extractImageFromJsonLd(jsonLdRecipe);
      return {
        content: `[STRUCTURED RECIPE DATA]\n${JSON.stringify(jsonLdRecipe, null, 2)}`,
        extractedImageUrl,
      };
    }
    // Extract image from HTML meta tags
    extractedImageUrl = extractImageFromHtml(html);
    // Fall back to extracting text content
    return {
      content: extractTextFromHtml(html),
      extractedImageUrl,
    };
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
 * Known recipe site domains for link detection
 */
const RECIPE_SITE_PATTERNS = [
  /allrecipes\.com/i,
  /foodnetwork\.com/i,
  /epicurious\.com/i,
  /seriouseats\.com/i,
  /bonappetit\.com/i,
  /tasty\.co/i,
  /delish\.com/i,
  /simplyrecipes\.com/i,
  /budgetbytes\.com/i,
  /skinnytaste\.com/i,
  /cookieandkate\.com/i,
  /minimalistbaker\.com/i,
  /halfbakedharvest\.com/i,
  /pinchofyum\.com/i,
  /loveandlemons\.com/i,
  /damndelicious\.net/i,
  /thekitchn\.com/i,
  /food52\.com/i,
  /smittenkitchen\.com/i,
  /sallysbakingaddiction\.com/i,
  /kingarthurbaking\.com/i,
  /bbc\.co\.uk\/food/i,
  /bbcgoodfood\.com/i,
  /taste\.com\.au/i,
  /recipetineats\.com/i,
  /justonecookbook\.com/i,
  /woksoflife\.com/i,
  /maangchi\.com/i,
  /thewoksoflife\.com/i,
  /cafedelites\.com/i,
  /gimmesomeoven\.com/i,
  /hostthetoast\.com/i,
  /iamafoodblog\.com/i,
  /marthastewart\.com/i,
  /myrecipes\.com/i,
  /eatingwell\.com/i,
  /cooking\.nytimes\.com/i,
  /recipes\.com/i,
  /yummly\.com/i,
  /food\.com/i,
];

/**
 * Link shortener services that might contain recipe links
 */
const LINK_SHORTENER_PATTERNS = [
  /bit\.ly/i,
  /tinyurl\.com/i,
  /t\.co/i,
  /goo\.gl/i,
  /ow\.ly/i,
  /buff\.ly/i,
  /linktr\.ee/i,
  /stan\.store/i,
  /beacons\.ai/i,
  /linkin\.bio/i,
  /tap\.bio/i,
  /bio\.link/i,
  /hoo\.be/i,
  /snipfeed\.co/i,
  /lnk\.to/i,
];

/**
 * Extract potential recipe links from HTML content
 * Looks for links to known recipe sites or link-in-bio services
 */
function extractRecipeLinks(html: string, sourceUrl: string): string[] {
  const links: string[] = [];
  const seenUrls = new Set<string>();
  
  // Get the source domain to exclude self-links
  let sourceDomain = '';
  try {
    sourceDomain = new URL(sourceUrl).hostname.toLowerCase();
  } catch {
    // Ignore
  }
  
  // Find all href attributes in anchor tags
  const hrefPattern = /href=["']([^"']+)["']/gi;
  let match;
  
  while ((match = hrefPattern.exec(html)) !== null) {
    let url = match[1];
    
    // Skip empty, anchor, or javascript links
    if (!url || url.startsWith('#') || url.startsWith('javascript:')) {
      continue;
    }
    
    // Make relative URLs absolute
    if (!url.startsWith('http')) {
      try {
        url = new URL(url, sourceUrl).href;
      } catch {
        continue;
      }
    }
    
    // Skip if we've already seen this URL
    if (seenUrls.has(url.toLowerCase())) continue;
    seenUrls.add(url.toLowerCase());
    
    // Skip self-links (same domain as source)
    try {
      const urlDomain = new URL(url).hostname.toLowerCase();
      if (urlDomain === sourceDomain) continue;
    } catch {
      continue;
    }
    
    // Check if it's a known recipe site
    const isRecipeSite = RECIPE_SITE_PATTERNS.some(pattern => pattern.test(url));
    if (isRecipeSite) {
      links.push(url);
      continue;
    }
    
    // Check if it's a link shortener (might lead to recipe)
    const isLinkShortener = LINK_SHORTENER_PATTERNS.some(pattern => pattern.test(url));
    if (isLinkShortener) {
      links.push(url);
      continue;
    }
    
    // Check if URL contains recipe-related keywords
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('recipe') || lowerUrl.includes('cook') || 
        lowerUrl.includes('food') || lowerUrl.includes('dish')) {
      links.push(url);
    }
  }
  
  // Also look for URLs in text content (sometimes not in anchor tags)
  const textUrls = html.match(/https?:\/\/[^\s<>"']+/gi) || [];
  for (const url of textUrls) {
    if (seenUrls.has(url.toLowerCase())) continue;
    seenUrls.add(url.toLowerCase());
    
    const isRecipeSite = RECIPE_SITE_PATTERNS.some(pattern => pattern.test(url));
    const isLinkShortener = LINK_SHORTENER_PATTERNS.some(pattern => pattern.test(url));
    
    if (isRecipeSite || isLinkShortener) {
      links.push(url);
    }
  }
  
  return links;
}

/**
 * Follow a shortened URL to get the final destination
 */
async function followShortUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DinnerPlans/1.0)',
      },
    });
    
    // Return the final URL after redirects
    if (response.url && response.url !== url) {
      return response.url;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get platform-specific error message
 */
function getSocialMediaErrorHint(platform: ImportPlatform): string | null {
  const hints: Partial<Record<ImportPlatform, string>> = {
    instagram: 'Instagram posts often contain recipes in images or videos. Try taking a screenshot of the recipe and importing the image instead.',
    tiktok: 'TikTok videos contain recipes visually. Try taking a screenshot of the recipe details or ingredients from the video.',
    youtube: 'YouTube recipe videos may not have text content we can extract. Try copying the recipe from the video description or comments.',
    facebook: 'Facebook posts may have limited access. Try taking a screenshot of the recipe or copying the recipe text.',
    pinterest: 'Pinterest pins often link to external recipe sites. If this fails, try opening the original recipe link.',
  };
  return hints[platform] || null;
}

/**
 * Check if platform is a social media site
 */
function isSocialMediaPlatform(platform: ImportPlatform): boolean {
  return ['instagram', 'tiktok', 'youtube', 'facebook', 'pinterest'].includes(platform);
}

/**
 * Try to import from a recipe link found on a social media page
 * This is a simplified version that doesn't recurse
 */
async function tryImportFromRecipeLink(recipeUrl: string): Promise<RecipeImportResult | null> {
  try {
    const { content, extractedImageUrl } = await fetchWebpageContent(recipeUrl);
    
    // Check if we got meaningful content
    const contentLength = content.replace(/\s+/g, '').length;
    if (contentLength < 100) {
      return null;
    }
    
    const aiResponse = await callOpenAIText(URL_EXTRACTION_PROMPT, content);
    const extracted = parseJSONResponse<ExtractedRecipeData>(aiResponse);
    const confidence = calculateConfidence(extracted);
    
    // Only accept if confidence is reasonable
    if (confidence < 0.4) {
      return null;
    }
    
    // Use extracted image URL if AI didn't find one
    if (!extracted.imageUrl && extractedImageUrl) {
      extracted.imageUrl = extractedImageUrl;
    }
    
    // Make relative URLs absolute
    if (extracted.imageUrl && !extracted.imageUrl.startsWith('http')) {
      try {
        const baseUrl = new URL(recipeUrl);
        extracted.imageUrl = new URL(extracted.imageUrl, baseUrl.origin).href;
      } catch {
        // Keep the original URL if parsing fails
      }
    }
    
    const recipe = toImportedRecipe(extracted, 'web', recipeUrl);
    return {
      success: true,
      recipe,
      error: null,
      confidence,
      platform: 'web',
      warnings: confidence < 0.7 ? ['Some recipe details may be incomplete'] : undefined,
    };
  } catch {
    return null;
  }
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
    // Fetch the page HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DinnerPlans/1.0; Recipe Importer)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }
    
    const html = await response.text();
    
    // For social media platforms, first look for external recipe links
    if (isSocialMediaPlatform(platform)) {
      console.log(`[RecipeImporter] Social media detected (${platform}), scanning for recipe links...`);
      
      const recipeLinks = extractRecipeLinks(html, url);
      console.log(`[RecipeImporter] Found ${recipeLinks.length} potential recipe links`);
      
      // Try each recipe link (limit to first 3 to avoid too many requests)
      for (const link of recipeLinks.slice(0, 3)) {
        console.log(`[RecipeImporter] Trying recipe link: ${link}`);
        
        // Check if it's a link shortener - follow it first
        const isShortener = LINK_SHORTENER_PATTERNS.some(p => p.test(link));
        let targetUrl = link;
        
        if (isShortener) {
          console.log(`[RecipeImporter] Following shortened URL...`);
          const expandedUrl = await followShortUrl(link);
          if (expandedUrl) {
            targetUrl = expandedUrl;
            console.log(`[RecipeImporter] Expanded to: ${targetUrl}`);
          }
        }
        
        // Try to import from this link
        const result = await tryImportFromRecipeLink(targetUrl);
        if (result && result.success) {
          console.log(`[RecipeImporter] Successfully imported from linked recipe!`);
          return result;
        }
      }
      
      console.log(`[RecipeImporter] No recipe links worked, trying direct content extraction...`);
    }
    
    // Process the HTML content (either non-social media or fallback)
    let extractedImageUrl: string | null = null;
    let content: string;
    
    // Try to extract JSON-LD recipe schema first (most reliable)
    const jsonLdRecipe = extractJsonLdRecipe(html);
    if (jsonLdRecipe) {
      extractedImageUrl = extractImageFromJsonLd(jsonLdRecipe);
      content = `[STRUCTURED RECIPE DATA]\n${JSON.stringify(jsonLdRecipe, null, 2)}`;
    } else {
      extractedImageUrl = extractImageFromHtml(html);
      content = extractTextFromHtml(html);
    }
    
    // Check if we got meaningful content
    const contentLength = content.replace(/\s+/g, '').length;
    if (contentLength < 100) {
      const hint = getSocialMediaErrorHint(platform);
      return {
        success: false,
        recipe: null,
        error: hint || 'Could not extract enough content from this page. The page may require JavaScript or authentication.',
        confidence: 0,
        platform,
      };
    }
    
    const aiResponse = await callOpenAIText(URL_EXTRACTION_PROMPT, content);
    const extracted = parseJSONResponse<ExtractedRecipeData>(aiResponse);
    const confidence = calculateConfidence(extracted);
    
    // If confidence is too low, provide platform-specific help
    if (confidence < 0.3) {
      const hint = getSocialMediaErrorHint(platform);
      if (hint) {
        return {
          success: false,
          recipe: null,
          error: `Could not find a recipe on this page. ${hint}`,
          confidence: 0,
          platform,
        };
      }
    }
    
    // Use extracted image URL if AI didn't find one
    if (!extracted.imageUrl && extractedImageUrl) {
      extracted.imageUrl = extractedImageUrl;
    }
    // Make relative URLs absolute
    if (extracted.imageUrl && !extracted.imageUrl.startsWith('http')) {
      try {
        const baseUrl = new URL(url);
        extracted.imageUrl = new URL(extracted.imageUrl, baseUrl.origin).href;
      } catch {
        // Keep the original URL if parsing fails
      }
    }
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
    const hint = getSocialMediaErrorHint(platform);
    let errorMessage = (error as Error).message;
    
    // Make error messages more user-friendly
    if (errorMessage.includes('Failed to fetch')) {
      errorMessage = hint 
        ? `Could not access this page. ${hint}`
        : 'Could not access this page. It may require login or have restricted access.';
    }
    
    return {
      success: false,
      recipe: null,
      error: errorMessage,
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
    const aiResponse = await callOpenAIText(TEXT_EXTRACTION_PROMPT, text);
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
    const aiResponse = await callOpenAIVision(imageBase64);
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

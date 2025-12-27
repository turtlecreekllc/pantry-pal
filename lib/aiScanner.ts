import { ScannedItem, ReceiptScanResult, PhotoScanResult, Location, Unit } from './types';

// Generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 15);

// Get API key from environment
const getOpenAIKey = (): string => {
  const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!key) {
    throw new Error('EXPO_PUBLIC_OPENAI_API_KEY is not configured. Please add it to your .env file.');
  }
  return key;
};

// Parse unit string to Unit type
function parseUnit(unitStr: string): Unit {
  const normalized = unitStr.toLowerCase().trim();

  const unitMap: Record<string, Unit> = {
    'item': 'item',
    'items': 'item',
    'piece': 'item',
    'pieces': 'item',
    'pcs': 'item',
    'each': 'item',
    'oz': 'oz',
    'ounce': 'oz',
    'ounces': 'oz',
    'lb': 'lb',
    'lbs': 'lb',
    'pound': 'lb',
    'pounds': 'lb',
    'g': 'g',
    'gram': 'g',
    'grams': 'g',
    'kg': 'kg',
    'kilogram': 'kg',
    'kilograms': 'kg',
    'ml': 'ml',
    'milliliter': 'ml',
    'milliliters': 'ml',
    'l': 'l',
    'liter': 'l',
    'liters': 'l',
    'cup': 'cup',
    'cups': 'cup',
    'tbsp': 'tbsp',
    'tablespoon': 'tbsp',
    'tablespoons': 'tbsp',
    'tsp': 'tsp',
    'teaspoon': 'tsp',
    'teaspoons': 'tsp',
  };

  return unitMap[normalized] || 'item';
}

// AI prompts
const RECEIPT_PROMPT = `Analyze this grocery receipt image and extract all food items.
For each item, provide:
- name: The product name (clean, without price or codes)
- quantity: Numeric quantity purchased (default to 1 if unclear)
- unit: The unit (item, oz, lb, g, kg, ml, l, cup, tbsp, tsp)
- brand: Brand name if visible (null if not)
- category: One of (Produce, Dairy, Meat, Pantry, Frozen, Beverages, Snacks, Other)
- confidence: Your confidence in the extraction (0.0 to 1.0)

Also extract:
- storeName: The store name if visible (null if not)
- date: The receipt date if visible in YYYY-MM-DD format (null if not)
- total: The total amount if visible (null if not)

IMPORTANT: Only include actual food/grocery items. Skip non-food items, taxes, discounts, subtotals, etc.

Respond ONLY with valid JSON, no markdown or explanation:
{
  "items": [
    {"name": "...", "quantity": 1, "unit": "item", "brand": "..." or null, "category": "...", "confidence": 0.9}
  ],
  "storeName": "..." or null,
  "date": "YYYY-MM-DD" or null,
  "total": 0.00 or null
}`;

const SHELF_PROMPT = `Analyze this photo of a kitchen shelf, cupboard, refrigerator, or pantry and identify all visible food items.
For each item you can clearly identify, provide:
- name: The product name
- quantity: Estimated quantity visible (number of items, bottles, cans, etc.)
- unit: The unit (item, oz, lb, g, kg, ml, l) - use "item" for countable items
- brand: Brand name if visible on packaging (null if not readable)
- category: One of (Produce, Dairy, Meat, Pantry, Frozen, Beverages, Snacks, Other)
- confidence: Your confidence in the identification (0.0 to 1.0)

IMPORTANT:
- Only include items you can clearly see and identify
- Estimate quantities conservatively
- For partially visible items, use lower confidence scores

Respond ONLY with valid JSON, no markdown or explanation:
{
  "items": [
    {"name": "...", "quantity": 1, "unit": "item", "brand": "..." or null, "category": "...", "confidence": 0.9}
  ]
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

interface ParsedReceiptResponse {
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    brand?: string | null;
    category?: string;
    confidence: number;
  }>;
  storeName?: string | null;
  date?: string | null;
  total?: number | null;
}

interface ParsedShelfResponse {
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    brand?: string | null;
    category?: string;
    confidence: number;
  }>;
}

async function callOpenAIVision(imageBase64: string, prompt: string): Promise<string> {
  const apiKey = getOpenAIKey();

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
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
      max_tokens: 2000,
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

function parseJSONResponse<T>(content: string): T {
  // Remove markdown code blocks if present
  let cleaned = content.trim();
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
    throw new Error('Failed to parse AI response as JSON');
  }
}

export async function analyzeReceiptImage(imageBase64: string): Promise<ReceiptScanResult> {
  const content = await callOpenAIVision(imageBase64, RECEIPT_PROMPT);
  const parsed = parseJSONResponse<ParsedReceiptResponse>(content);

  const items: ScannedItem[] = (parsed.items || []).map((item) => ({
    id: generateId(),
    name: item.name,
    quantity: item.quantity || 1,
    unit: parseUnit(item.unit || 'item'),
    brand: item.brand || undefined,
    category: item.category,
    confidence: Math.min(1, Math.max(0, item.confidence || 0.8)),
    status: 'pending' as const,
    originalData: {
      name: item.name,
      quantity: item.quantity || 1,
      unit: parseUnit(item.unit || 'item'),
    },
  }));

  return {
    items,
    storeName: parsed.storeName || undefined,
    date: parsed.date || undefined,
    total: parsed.total || undefined,
    imageUri: '',
  };
}

export async function analyzeShelfPhoto(
  imageBase64: string,
  location: Location
): Promise<PhotoScanResult> {
  const content = await callOpenAIVision(imageBase64, SHELF_PROMPT);
  const parsed = parseJSONResponse<ParsedShelfResponse>(content);

  const items: ScannedItem[] = (parsed.items || []).map((item) => ({
    id: generateId(),
    name: item.name,
    quantity: item.quantity || 1,
    unit: parseUnit(item.unit || 'item'),
    brand: item.brand || undefined,
    category: item.category,
    confidence: Math.min(1, Math.max(0, item.confidence || 0.8)),
    status: 'pending' as const,
    originalData: {
      name: item.name,
      quantity: item.quantity || 1,
      unit: parseUnit(item.unit || 'item'),
    },
  }));

  return {
    items,
    location,
    imageUri: '',
  };
}

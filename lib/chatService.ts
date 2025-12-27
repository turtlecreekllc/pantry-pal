import { PantryItem, RecipePreview, ChatMessage } from './types';
import { searchRecipes, searchByIngredients } from './recipeService';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// System prompt for the AI assistant
const SYSTEM_PROMPT = `You are a friendly kitchen companion AI assistant for Pantry Pal, a smart pantry management app.

Your role is to help users:
- Discover recipes based on ingredients they have
- Track what's expiring soon and suggest ways to use those items
- Update their pantry inventory through conversation
- Answer questions about what's in their pantry

Personality:
- Be warm, helpful, and encouraging
- Keep responses concise but informative
- Use casual, friendly language
- When suggesting recipes, explain why they're a good match
- If items are expiring, gently remind users and suggest quick recipes

When responding:
- Always consider the user's current pantry context
- Prioritize recipes that use ingredients they already have
- Be specific about quantities and items when discussing pantry contents
- If asked to update inventory, confirm the changes clearly`;

// Define available functions for OpenAI function calling
const FUNCTIONS = [
  {
    name: 'get_pantry_items',
    description: 'Get all items currently in the user\'s pantry with details about quantity, location, and expiration',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          enum: ['pantry', 'fridge', 'freezer', 'all'],
          description: 'Filter items by storage location',
        },
      },
    },
  },
  {
    name: 'get_expiring_items',
    description: 'Get items that are expiring soon (within the next 7 days)',
    parameters: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Number of days to look ahead (default: 7)',
        },
      },
    },
  },
  {
    name: 'search_recipes',
    description: 'Search for recipes by name or keywords',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for recipe name or type (e.g., "chicken pasta", "quick dinner")',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_recipes_by_ingredients',
    description: 'Search for recipes that use specific ingredients from the pantry',
    parameters: {
      type: 'object',
      properties: {
        ingredients: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of ingredient names to search with',
        },
      },
      required: ['ingredients'],
    },
  },
  {
    name: 'check_pantry_for_item',
    description: 'Check if a specific item exists in the pantry and return its details',
    parameters: {
      type: 'object',
      properties: {
        itemName: {
          type: 'string',
          description: 'Name of the item to search for',
        },
      },
      required: ['itemName'],
    },
  },
];

// Build context about the user's pantry for the AI
function buildPantryContext(pantryItems: PantryItem[]): string {
  if (pantryItems.length === 0) {
    return 'The pantry is currently empty.';
  }

  const currentTime = new Date();
  const expiringItems = pantryItems.filter((item) => {
    if (!item.expiration_date) return false;
    const expDate = new Date(item.expiration_date);
    const daysUntilExpiry = (expDate.getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
  });

  const byLocation = {
    pantry: pantryItems.filter((i) => i.location === 'pantry'),
    fridge: pantryItems.filter((i) => i.location === 'fridge'),
    freezer: pantryItems.filter((i) => i.location === 'freezer'),
  };

  let context = `Current pantry inventory (${pantryItems.length} total items):\n\n`;

  // Add items by location
  for (const [location, items] of Object.entries(byLocation)) {
    if (items.length > 0) {
      context += `${location.charAt(0).toUpperCase() + location.slice(1)} (${items.length} items):\n`;
      items.slice(0, 10).forEach((item) => {
        context += `- ${item.name}: ${item.quantity} ${item.unit}`;
        if (item.expiration_date) {
          const expDate = new Date(item.expiration_date);
          const daysUntil = Math.round((expDate.getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntil <= 7 && daysUntil >= 0) {
            context += ` (expires in ${daysUntil} days)`;
          }
        }
        context += '\n';
      });
      if (items.length > 10) {
        context += `... and ${items.length - 10} more items\n`;
      }
      context += '\n';
    }
  }

  if (expiringItems.length > 0) {
    context += `\nIMPORTANT: ${expiringItems.length} items are expiring soon:\n`;
    expiringItems.forEach((item) => {
      const expDate = new Date(item.expiration_date!);
      const daysUntil = Math.round((expDate.getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24));
      context += `- ${item.name}: ${item.quantity} ${item.unit} (expires in ${daysUntil} days)\n`;
    });
  }

  return context;
}

// Execute function calls from OpenAI
async function executeFunctionCall(
  functionName: string,
  args: any,
  pantryItems: PantryItem[]
): Promise<any> {
  switch (functionName) {
    case 'get_pantry_items': {
      const location = args.location || 'all';
      if (location === 'all') {
        return pantryItems;
      }
      return pantryItems.filter((item) => item.location === location);
    }

    case 'get_expiring_items': {
      const days = args.days || 7;
      const currentTime = new Date();
      return pantryItems.filter((item) => {
        if (!item.expiration_date) return false;
        const expDate = new Date(item.expiration_date);
        const daysUntilExpiry = (expDate.getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24);
        return daysUntilExpiry >= 0 && daysUntilExpiry <= days;
      });
    }

    case 'search_recipes': {
      const recipes = await searchRecipes(args.query);
      return recipes.slice(0, 5); // Limit to top 5 results
    }

    case 'search_recipes_by_ingredients': {
      const recipes = await searchByIngredients(args.ingredients);
      return recipes.slice(0, 5); // Limit to top 5 results
    }

    case 'check_pantry_for_item': {
      const itemName = args.itemName.toLowerCase();
      const matchingItems = pantryItems.filter((item) =>
        item.name.toLowerCase().includes(itemName) || itemName.includes(item.name.toLowerCase())
      );
      return matchingItems;
    }

    default:
      return null;
  }
}

// Main chat function
export async function sendChatMessage(
  userMessage: string,
  pantryItems: PantryItem[],
  conversationHistory: ChatMessage[] = []
): Promise<ChatMessage> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured. Please add EXPO_PUBLIC_OPENAI_API_KEY to your .env file.');
  }

  try {
    // Build messages array for OpenAI
    const messages = [
      {
        role: 'system',
        content: SYSTEM_PROMPT + '\n\nCurrent time: ' + new Date().toISOString() + '\n\n' + buildPantryContext(pantryItems),
      },
      // Add conversation history (last 10 messages to avoid token limits)
      ...conversationHistory.slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: 'user',
        content: userMessage,
      },
    ];

    // Initial API call
    let response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        functions: FUNCTIONS,
        function_call: 'auto',
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }

    let data = await response.json();
    let assistantMessage = data.choices[0].message;

    // Handle function calls
    const collectedRecipes: RecipePreview[] = [];
    const collectedItems: PantryItem[] = [];
    let functionCallCount = 0;
    const maxFunctionCalls = 5; // Prevent infinite loops

    while (assistantMessage.function_call && functionCallCount < maxFunctionCalls) {
      functionCallCount++;

      const functionName = assistantMessage.function_call.name;
      const functionArgs = JSON.parse(assistantMessage.function_call.arguments);

      // Execute the function
      const functionResult = await executeFunctionCall(functionName, functionArgs, pantryItems);

      // Collect recipes and items for the response
      if (functionName === 'search_recipes' || functionName === 'search_recipes_by_ingredients') {
        if (Array.isArray(functionResult)) {
          collectedRecipes.push(...functionResult);
        }
      } else if (functionName === 'get_expiring_items' || functionName === 'check_pantry_for_item' || functionName === 'get_pantry_items') {
        if (Array.isArray(functionResult)) {
          collectedItems.push(...functionResult);
        }
      }

      // Add function call and result to messages
      messages.push({
        role: 'assistant',
        content: assistantMessage.content || '',
        function_call: assistantMessage.function_call,
      } as any);

      messages.push({
        role: 'function',
        name: functionName,
        content: JSON.stringify(functionResult),
      } as any);

      // Make another API call with the function result
      response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages,
          functions: FUNCTIONS,
          function_call: 'auto',
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }

      data = await response.json();
      assistantMessage = data.choices[0].message;
    }

    // Create the chat message response
    const chatMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: assistantMessage.content || 'I found some information for you.',
      timestamp: new Date().toISOString(),
    };

    // Add recipes if any were found
    if (collectedRecipes.length > 0) {
      chatMessage.recipes = collectedRecipes;
    }

    // Add items if any were found
    if (collectedItems.length > 0) {
      chatMessage.items = collectedItems;
    }

    return chatMessage;
  } catch (error) {
    console.error('Chat service error:', error);
    throw error;
  }
}

// Get suggested prompts based on pantry state
export function getSuggestedPrompts(pantryItems: PantryItem[]): string[] {
  const hasItems = pantryItems.length > 0;
  const currentTime = new Date();
  const expiringItems = pantryItems.filter((item) => {
    if (!item.expiration_date) return false;
    const expDate = new Date(item.expiration_date);
    const daysUntilExpiry = (expDate.getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
  });

  const suggestions = [
    "What can I make for dinner?",
    "What's expiring soon?",
  ];

  if (hasItems) {
    // Add item-specific suggestions
    const hasChicken = pantryItems.some((item) => item.name.toLowerCase().includes('chicken'));
    const hasEggs = pantryItems.some((item) => item.name.toLowerCase().includes('egg'));

    if (hasChicken) {
      suggestions.push("Something quick with chicken");
    } else if (hasEggs) {
      suggestions.push("Easy breakfast ideas");
    } else {
      suggestions.push("Quick weeknight dinner");
    }

    suggestions.push("Do I have eggs?");
  } else {
    suggestions.push("How do I add items?");
    suggestions.push("What is Pantry Pal?");
  }

  return suggestions;
}

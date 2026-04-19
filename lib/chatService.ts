import { PantryItem, RecipePreview, ChatMessage } from './types';
import { searchRecipes, searchByIngredients } from './recipeService';
import { callClaudeWithTools } from './claudeService';

// System prompt for the AI assistant
const SYSTEM_PROMPT = `You are a friendly kitchen companion AI assistant for DinnerPlans, a smart pantry management app.

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

// Claude tool definitions (equivalent to OpenAI functions)
const TOOLS = [
  {
    name: 'get_pantry_items',
    description: "Get all items currently in the user's pantry with details about quantity, location, and expiration",
    input_schema: {
      type: 'object' as const,
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
    input_schema: {
      type: 'object' as const,
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
    input_schema: {
      type: 'object' as const,
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
    input_schema: {
      type: 'object' as const,
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
    input_schema: {
      type: 'object' as const,
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

// Execute tool calls from Claude
async function executeToolCall(
  toolName: string,
  args: any,
  pantryItems: PantryItem[]
): Promise<string> {
  switch (toolName) {
    case 'get_pantry_items': {
      const location = args.location || 'all';
      const result = location === 'all'
        ? pantryItems
        : pantryItems.filter((item) => item.location === location);
      return JSON.stringify(result);
    }

    case 'get_expiring_items': {
      const days = args.days || 7;
      const currentTime = new Date();
      const result = pantryItems.filter((item) => {
        if (!item.expiration_date) return false;
        const expDate = new Date(item.expiration_date);
        const daysUntilExpiry = (expDate.getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24);
        return daysUntilExpiry >= 0 && daysUntilExpiry <= days;
      });
      return JSON.stringify(result);
    }

    case 'search_recipes': {
      const recipes = await searchRecipes(args.query);
      return JSON.stringify(recipes.slice(0, 5));
    }

    case 'search_recipes_by_ingredients': {
      const recipes = await searchByIngredients(args.ingredients);
      return JSON.stringify(recipes.slice(0, 5));
    }

    case 'check_pantry_for_item': {
      const itemName = args.itemName.toLowerCase();
      const matchingItems = pantryItems.filter((item) =>
        item.name.toLowerCase().includes(itemName) || itemName.includes(item.name.toLowerCase())
      );
      return JSON.stringify(matchingItems);
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

// Main chat function
export async function sendChatMessage(
  userMessage: string,
  pantryItems: PantryItem[],
  conversationHistory: ChatMessage[] = []
): Promise<ChatMessage> {
  try {
    const systemPrompt = SYSTEM_PROMPT + '\n\nCurrent time: ' + new Date().toISOString() + '\n\n' + buildPantryContext(pantryItems);

    const initialMessages = [
      ...conversationHistory.slice(-10).map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user' as const, content: userMessage },
    ];

    const collectedRecipes: RecipePreview[] = [];
    const collectedItems: PantryItem[] = [];

    const result = await callClaudeWithTools(
      systemPrompt,
      TOOLS,
      initialMessages,
      async (toolName: string, toolInput: any) => {
        const toolResult = await executeToolCall(toolName, toolInput, pantryItems);

        // Collect recipes and items for the response metadata
        const parsed = JSON.parse(toolResult);
        if (Array.isArray(parsed)) {
          if (toolName === 'search_recipes' || toolName === 'search_recipes_by_ingredients') {
            collectedRecipes.push(...parsed);
          } else if (
            toolName === 'get_expiring_items' ||
            toolName === 'check_pantry_for_item' ||
            toolName === 'get_pantry_items'
          ) {
            collectedItems.push(...parsed);
          }
        }

        return toolResult;
      }
    );

    const chatMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: result.text || 'I found some information for you.',
      timestamp: new Date().toISOString(),
    };

    if (collectedRecipes.length > 0) {
      chatMessage.recipes = collectedRecipes;
    }

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
    suggestions.push("Help me stock my pantry");
    suggestions.push("What should I buy this week?");
  }

  if (expiringItems.length > 0) {
    suggestions.push(`Use up my ${expiringItems[0].name}`);
  }

  return suggestions.slice(0, 4);
}

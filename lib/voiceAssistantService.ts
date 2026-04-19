import { ScannedItem, Unit, Location, FillLevel } from './types';
import { callClaude } from './claudeService';

/**
 * Represents an update to a scanned item from voice input
 */
export interface ItemUpdate {
  field: 'name' | 'brand' | 'quantity' | 'unitCount' | 'volumeQuantity' | 'volumeUnit' | 'location' | 'fillLevel' | 'expirationDate';
  value: string | number | undefined;
  originalValue?: string | number | undefined;
}

/**
 * Special actions that don't update item fields
 */
export type SpecialAction = 
  | 'approve'
  | 'skip'
  | 'describe'
  | 'help'
  | 'go_back'
  | 'exit'
  | 'none';

/**
 * Response from the voice assistant AI
 */
export interface VoiceAssistantResponse {
  message: string;
  updates: ItemUpdate[];
  confirmationNeeded: boolean;
  suggestedFollowUp?: string;
  action?: SpecialAction;
}

/**
 * Context provided to the AI for understanding the current item
 */
export interface ItemContext {
  name: string;
  brand?: string;
  quantity: number;
  unit: Unit;
  unitCount?: number;
  volumeQuantity?: number;
  volumeUnit?: Unit;
  location: Location;
  fillLevel?: FillLevel;
  expirationDate?: string;
  category?: string;
  confidence: number;
}

/**
 * Progress context for the review session
 */
export interface ReviewProgress {
  currentIndex: number;
  totalItems: number;
  approvedCount: number;
  skippedCount: number;
}

const SYSTEM_PROMPT = `You are a helpful voice assistant for a meal planning and pantry management app called Dinner Plans. The user is reviewing items detected from a photo scan and wants to validate or correct them using voice commands.

Your role is to:
1. Understand user commands (approve, skip, describe, correct, navigate)
2. Extract specific field updates from natural speech
3. Respond conversationally to confirm changes
4. Guide users through the review process efficiently

IMPORTANT: Always respond with a JSON object containing:
- "message": A friendly, conversational response (1-2 sentences max)
- "updates": Array of field updates to apply (empty if no changes)
- "confirmationNeeded": Boolean - true if you need user to confirm something
- "suggestedFollowUp": Optional follow-up question
- "action": Special action if applicable: "approve", "skip", "describe", "help", "go_back", "exit", or "none"

COMMAND RECOGNITION:
- APPROVE: "yes", "correct", "that's right", "approve", "next", "looks good", "add", "confirm", "accept"
- SKIP: "skip", "remove", "don't add", "delete", "ignore this", "no", "reject"
- DESCRIBE: "describe this", "what do you see", "tell me more", "explain", "what is this"
- CORRECT NAME: "it's actually [name]", "change to [name]", "that's [name]", "rename to [name]"
- ADJUST QUANTITY: "there are [X]", "change quantity to [X]", "I have [X] of these", "[X] cans/bottles/items"
- GO BACK: "go back", "previous", "undo", "wait go back"
- EXIT: "stop", "pause", "finish later", "exit", "done", "close", "cancel"
- HELP: "help", "what can I say", "commands"

Field update format:
{
  "field": "name" | "brand" | "quantity" | "unitCount" | "volumeQuantity" | "volumeUnit" | "location" | "fillLevel" | "expirationDate",
  "value": the new value
}

Valid values:
- location: "pantry", "fridge", "freezer"
- fillLevel: "full", "3/4", "1/2", "1/4", "almost-empty"
- volumeUnit: "oz", "lb", "g", "kg", "ml", "l", "cup"
- expirationDate: "YYYY-MM-DD" format

Examples:

User: "Yes" or "That's correct"
Response: {"message": "Added to your pantry!", "updates": [], "confirmationNeeded": false, "action": "approve"}

User: "Skip this one"
Response: {"message": "Skipped.", "updates": [], "confirmationNeeded": false, "action": "skip"}

User: "What do you see?"
Response: {"message": "Let me describe what I detected...", "updates": [], "confirmationNeeded": false, "action": "describe"}

User: "Go back"
Response: {"message": "Going back to the previous item.", "updates": [], "confirmationNeeded": false, "action": "go_back"}

User: "Help"
Response: {"message": "You can say 'yes' to approve, 'skip' to remove, 'describe' for details, or tell me any corrections like 'change quantity to 3'.", "updates": [], "confirmationNeeded": false, "action": "help"}

User: "Actually there are 3 cans"
Response: {"message": "Got it, updated to 3 cans.", "updates": [{"field": "unitCount", "value": 3}], "confirmationNeeded": false, "action": "none"}

User: "It's the Heinz brand"
Response: {"message": "Updated to Heinz.", "updates": [{"field": "brand", "value": "Heinz"}], "confirmationNeeded": false, "action": "none"}

User: "Put this in the freezer"
Response: {"message": "Moving to freezer.", "updates": [{"field": "location", "value": "freezer"}], "confirmationNeeded": false, "action": "none"}

User: "It's about half full"
Response: {"message": "Set to half full.", "updates": [{"field": "fillLevel", "value": "1/2"}], "confirmationNeeded": false, "action": "none"}

User: "Expires January 15th"
Response: {"message": "Expiration set to January 15, 2025.", "updates": [{"field": "expirationDate", "value": "2025-01-15"}], "confirmationNeeded": false, "action": "none"}

User: "This is actually tomato sauce not tomato paste"
Response: {"message": "Changed to Tomato Sauce.", "updates": [{"field": "name", "value": "Tomato Sauce"}], "confirmationNeeded": false, "action": "none"}

Keep responses SHORT and natural. Prioritize efficiency in the review flow.`;

/**
 * Processes a voice command and returns AI-interpreted updates for the item
 */
export async function processVoiceCommand({
  transcript,
  currentItem,
  conversationHistory = [],
  progress,
}: {
  transcript: string;
  currentItem: ItemContext;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  progress?: ReviewProgress;
}): Promise<VoiceAssistantResponse> {
  const itemContextStr = `Current item being reviewed:
- Name: ${currentItem.name}
- Brand: ${currentItem.brand || 'Not specified'}
- Count: ${currentItem.unitCount || currentItem.quantity} ${currentItem.unitCount ? 'items' : currentItem.unit}
${currentItem.volumeQuantity ? `- Size per item: ${currentItem.volumeQuantity} ${currentItem.volumeUnit}` : ''}
- Location: ${currentItem.location}
- Fill Level: ${currentItem.fillLevel || 'Not specified'}
- Expiration: ${currentItem.expirationDate || 'Not set'}
- Category: ${currentItem.category || 'Unknown'}
- AI Confidence: ${Math.round(currentItem.confidence * 100)}%`;

  const progressStr = progress 
    ? `\n\nReview Progress: Item ${progress.currentIndex + 1} of ${progress.totalItems} (${progress.approvedCount} approved, ${progress.skippedCount} skipped)`
    : '';

  const userMessages = [
    ...conversationHistory.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user' as const, content: transcript },
  ];

  try {
    const content = await callClaude(
      SYSTEM_PROMPT + '\n\n' + itemContextStr + progressStr,
      userMessages,
      { maxTokens: 500, temperature: 0.3 }
    );

    const parsed = JSON.parse(content) as VoiceAssistantResponse;
    return {
      message: parsed.message || "I didn't catch that. Could you try again?",
      updates: parsed.updates || [],
      confirmationNeeded: parsed.confirmationNeeded || false,
      suggestedFollowUp: parsed.suggestedFollowUp,
      action: parsed.action || 'none',
    };
  } catch (error) {
    console.error('Voice assistant error:', error);
    return {
      message: "Sorry, I had trouble understanding. Could you repeat that?",
      updates: [],
      confirmationNeeded: false,
      action: 'none',
    };
  }
}

/**
 * Generates an AI description of the item using vision context
 */
export async function generateItemDescription(item: ItemContext): Promise<string> {
  const confidenceLevel = item.confidence >= 0.9 ? 'high' : item.confidence >= 0.7 ? 'medium' : 'low';
  const confidenceText = {
    high: 'I\'m quite confident this is',
    medium: 'I think this is',
    low: 'I\'m not entirely sure, but this appears to be',
  };

  let description = `${confidenceText[confidenceLevel]} ${item.brand ? `${item.brand} ` : ''}${item.name}. `;

  if (item.unitCount && item.volumeQuantity && item.volumeUnit) {
    description += `I see ${item.unitCount} ${item.unitCount === 1 ? 'container' : 'containers'}, each containing ${item.volumeQuantity} ${item.volumeUnit}. `;
  } else if (item.unitCount) {
    description += `I count ${item.unitCount} ${item.unitCount === 1 ? 'item' : 'items'}. `;
  } else {
    description += `The quantity appears to be ${item.quantity} ${item.unit}. `;
  }

  if (item.fillLevel) {
    const fillDescriptions: Record<FillLevel, string> = {
      'full': 'It looks full or unopened.',
      '3/4': 'It appears to be about three-quarters full.',
      '1/2': 'It looks about half full.',
      '1/4': 'It appears to be about one-quarter full.',
      'almost-empty': 'It looks almost empty.',
    };
    description += fillDescriptions[item.fillLevel] + ' ';
  }

  if (item.category) {
    description += `This is categorized as ${item.category}. `;
  }

  description += `Would you like to make any changes, or should I add it to your ${item.location}?`;

  return description;
}

/**
 * Applies updates from the voice assistant to a ScannedItem
 */
export function applyUpdatesToItem(item: ScannedItem, updates: ItemUpdate[]): ScannedItem {
  const updatedItem = { ...item };

  for (const update of updates) {
    switch (update.field) {
      case 'name':
        if (typeof update.value === 'string') {
          updatedItem.name = update.value;
        }
        break;
      case 'brand':
        if (typeof update.value === 'string' || update.value === undefined) {
          updatedItem.brand = update.value as string | undefined;
        }
        break;
      case 'quantity':
        if (typeof update.value === 'number') {
          updatedItem.quantity = update.value;
        }
        break;
      case 'unitCount':
        if (typeof update.value === 'number') {
          updatedItem.unitCount = update.value;
          // Recalculate total quantity
          if (updatedItem.volumeQuantity) {
            updatedItem.quantity = update.value * updatedItem.volumeQuantity;
          } else {
            updatedItem.quantity = update.value;
          }
        }
        break;
      case 'volumeQuantity':
        if (typeof update.value === 'number') {
          updatedItem.volumeQuantity = update.value;
          // Recalculate total quantity
          if (updatedItem.unitCount) {
            updatedItem.quantity = updatedItem.unitCount * update.value;
          }
        }
        break;
      case 'volumeUnit':
        if (typeof update.value === 'string') {
          updatedItem.volumeUnit = update.value as Unit;
          updatedItem.unit = update.value as Unit;
        }
        break;
      case 'fillLevel':
        if (typeof update.value === 'string' || update.value === undefined) {
          updatedItem.fillLevel = update.value as FillLevel | undefined;
        }
        break;
      case 'expirationDate':
        if (typeof update.value === 'string' || update.value === undefined) {
          updatedItem.expirationDate = update.value as string | undefined;
        }
        break;
      default:
        break;
    }
  }

  updatedItem.status = 'edited';
  return updatedItem;
}

/**
 * Generates a summary of the current item for text-to-speech
 */
export function generateItemSummary(item: ScannedItem, location: Location): string {
  const parts: string[] = [];

  // Name and brand
  if (item.brand) {
    parts.push(`${item.brand} ${item.name}`);
  } else {
    parts.push(item.name);
  }

  // Quantity
  if (item.unitCount && item.volumeQuantity && item.volumeUnit) {
    parts.push(`${item.unitCount} ${item.unitCount === 1 ? 'item' : 'items'}, ${item.volumeQuantity} ${item.volumeUnit} each`);
  } else if (item.unitCount) {
    parts.push(`quantity ${item.unitCount}`);
  } else {
    parts.push(`quantity ${item.quantity} ${item.unit}`);
  }

  // Location
  parts.push(`in the ${location}`);

  // Fill level
  if (item.fillLevel) {
    const fillLabels: Record<FillLevel, string> = {
      'full': 'full',
      '3/4': 'three quarters full',
      '1/2': 'half full',
      '1/4': 'one quarter full',
      'almost-empty': 'almost empty',
    };
    parts.push(fillLabels[item.fillLevel]);
  }

  // Expiration
  if (item.expirationDate) {
    const date = new Date(item.expirationDate);
    const formatted = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    parts.push(`expires ${formatted}`);
  }

  return parts.join(', ') + '.';
}

/**
 * Generates confidence-based contextual prompts for item presentation
 * Per PRD: Different prompts based on AI confidence level
 */
export function getConfidenceBasedPrompt(item: ItemContext): string {
  const displayName = item.brand ? `${item.brand} ${item.name}` : item.name;

  if (item.confidence >= 0.9) {
    // High confidence
    return `This looks like ${displayName}. Ready to add it?`;
  } else if (item.confidence >= 0.7) {
    // Medium confidence
    return `I think this is ${displayName}, but I'm not certain. Would you like me to describe what I see?`;
  } else {
    // Low confidence
    return `I'm having trouble identifying this item. Can you tell me what it is?`;
  }
}

/**
 * Generates voice prompts for guiding the user through the review process
 */
export function getVoicePrompt(
  type: 'welcome' | 'next_item' | 'all_done' | 'edit_hint' | 'timeout' | 'progress' | 'help',
  context?: {
    itemName?: string;
    index?: number;
    total?: number;
    approved?: number;
    skipped?: number;
    confidence?: number;
  }
): string {
  switch (type) {
    case 'welcome':
      return `I found ${context?.total || 'some'} items. Let's review them together. Say "yes" to approve, "skip" to remove, or describe any changes.`;

    case 'next_item':
      const confidence = context?.confidence || 0.8;
      if (confidence >= 0.9) {
        return `Next: ${context?.itemName}. Does this look correct?`;
      } else if (confidence >= 0.7) {
        return `Next: I think this is ${context?.itemName}. Would you like me to describe it?`;
      } else {
        return `I'm not sure about this one. Can you tell me what it is?`;
      }

    case 'all_done':
      return `All done! I added ${context?.approved || 0} items to your pantry. ${context?.skipped ? `${context.skipped} items were skipped.` : ''}`;

    case 'edit_hint':
      return `You can say things like "change quantity to 3", "put in fridge", "it's half full", or "expires next week".`;

    case 'timeout':
      return `Still there? Say "yes" to approve, "skip" to remove, or "help" for more options.`;

    case 'progress':
      return `Great progress! ${context?.approved || 0} items reviewed, ${(context?.total || 0) - (context?.index || 0) - 1} remaining.`;

    case 'help':
      return `Available commands: Say "yes" to approve, "skip" to remove, "describe" for details, "go back" for previous item, or tell me any corrections like "change quantity to 3" or "put in fridge".`;

    default:
      return '';
  }
}

/**
 * Get help text for the voice assistant
 */
export function getHelpText(): string {
  return `Here's what you can say:
• "Yes" or "Correct" - Add this item to your pantry
• "Skip" or "Remove" - Don't add this item
• "Describe this" - Get more details about what I detected
• "Go back" - Return to the previous item
• "Change quantity to [number]" - Update the count
• "Put in [fridge/freezer/pantry]" - Change location
• "It's [brand name]" - Set the brand
• "Expires [date]" - Set expiration date
• "It's half full" - Set fill level
• "Help" - Hear these options again
• "Stop" - Save and exit`;
}

/**
 * Audio feedback types for the voice review session
 */
export type AudioFeedbackType = 'approve' | 'skip' | 'error' | 'complete' | 'listening' | 'processing';

/**
 * Get the appropriate audio feedback duration for each action type
 * Returns duration in milliseconds
 */
export function getAudioFeedbackDuration(type: AudioFeedbackType): number {
  switch (type) {
    case 'approve':
      return 200;
    case 'skip':
      return 150;
    case 'error':
      return 300;
    case 'complete':
      return 500;
    case 'listening':
      return 100;
    case 'processing':
      return 100;
    default:
      return 150;
  }
}

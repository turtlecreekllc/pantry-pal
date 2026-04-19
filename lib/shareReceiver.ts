import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { detectPlatform } from './recipeImporter';
import { ShareIntent } from 'expo-share-intent';

/**
 * Extract URL from text content
 * Handles various social media share formats
 */
function extractUrlFromText(text: string): string | null {
  if (!text) return null;
  
  // Standard URL pattern
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  const matches = text.match(urlPattern);
  
  if (matches && matches.length > 0) {
    // Clean up common trailing characters that get captured
    let url = matches[0];
    // Remove trailing punctuation that might have been captured
    url = url.replace(/[.,;:!?)]+$/, '');
    return url;
  }
  
  // Try to find shortened URLs without http (common in social media)
  const shortUrlPattern = /(?:vm\.tiktok\.com|bit\.ly|t\.co|goo\.gl|tinyurl\.com|ow\.ly)\/[^\s]+/gi;
  const shortMatches = text.match(shortUrlPattern);
  if (shortMatches && shortMatches.length > 0) {
    return 'https://' + shortMatches[0].replace(/[.,;:!?)]+$/, '');
  }
  
  return null;
}

/**
 * Parse shared content and navigate to import screen
 */
export async function handleSharedContent(url: string | null): Promise<boolean> {
  if (!url) return false;
  try {
    // Clean up the URL - trim whitespace and handle common issues
    const cleanUrl = url.trim();
    if (!cleanUrl || cleanUrl.length < 3) {
      console.warn('Shared content too short to process');
      return false;
    }
    // Check if it's a URL that could contain a recipe
    const isRecipeUrl = isRecipeSourceUrl(cleanUrl);
    if (isRecipeUrl) {
      // Validate URL format before navigating
      try {
        new URL(cleanUrl);
      } catch {
        console.warn('Invalid URL format received:', cleanUrl);
        return false;
      }
      // Navigate to share receiver for automatic processing
      router.push({
        pathname: '/share-receiver',
        params: { url: cleanUrl },
      });
      return true;
    }
    // If it's plain text (pasted recipe), go to text import
    if (!cleanUrl.startsWith('http') && cleanUrl.length > 50) {
      router.push({
        pathname: '/import/text',
        params: { sharedText: cleanUrl },
      });
      return true;
    }
    console.log('Shared content not recognized as recipe:', cleanUrl.substring(0, 100));
    return false;
  } catch (error) {
    console.error('Error handling shared content:', error);
    return false;
  }
}

/**
 * Handle share intent from expo-share-intent package
 */
export async function handleShareIntent(shareIntent: ShareIntent): Promise<boolean> {
  try {
    console.log('[ShareIntent] Processing:', {
      hasWebUrl: !!shareIntent.webUrl,
      hasText: !!shareIntent.text,
      textPreview: shareIntent.text?.substring(0, 100),
      filesCount: shareIntent.files?.length || 0,
    });
    
    let url: string | null = null;
    let imageUri: string | null = null;
    
    // Extract URL from webUrl or text
    if (shareIntent.webUrl) {
      url = shareIntent.webUrl;
      console.log('[ShareIntent] Using webUrl:', url);
    } else if (shareIntent.text) {
      url = extractUrlFromText(shareIntent.text);
      console.log('[ShareIntent] Extracted URL from text:', url);
    }
    
    // Extract image if present
    if (shareIntent.files && shareIntent.files.length > 0) {
      const imageFile = shareIntent.files.find(
        (f) => f.mimeType?.startsWith('image/') || f.path?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
      );
      if (imageFile) {
        imageUri = imageFile.path;
        console.log('[ShareIntent] Found image:', imageUri);
      }
    }
    
    // Navigate to share receiver if we have content
    if (url || imageUri) {
      const platform = url ? detectPlatform(url) : 'photo';
      router.push({
        pathname: '/share-receiver',
        params: {
          url: url || '',
          imageUri: imageUri || '',
          text: shareIntent.text || '',
          platform,
        },
      });
      return true;
    }
    
    // If we have text but couldn't extract a URL, try the text import
    if (shareIntent.text && shareIntent.text.length > 30) {
      console.log('[ShareIntent] No URL found, trying text import');
      router.push({
        pathname: '/import/text',
        params: { sharedText: shareIntent.text },
      });
      return true;
    }
    
    // Show error screen if we received something but couldn't process it
    if (shareIntent.text || shareIntent.webUrl) {
      console.log('[ShareIntent] Could not extract content, showing error');
      router.push({
        pathname: '/share-receiver',
        params: {
          url: '',
          imageUri: '',
          text: shareIntent.text || shareIntent.webUrl || '',
          platform: 'web',
          error: 'Could not find a recipe URL in the shared content. Try copying the recipe URL directly.',
        },
      });
      return true;
    }
    
    console.log('[ShareIntent] No processable content found');
    return false;
  } catch (error) {
    console.error('[ShareIntent] Error handling share intent:', error);
    return false;
  }
}

/**
 * Check if a URL is likely a recipe source
 * More permissive to allow users to try importing from any source
 */
function isRecipeSourceUrl(url: string): boolean {
  if (!url.startsWith('http')) return false;

  const platform = detectPlatform(url);
  // All recognized social media platforms are valid
  if (platform !== 'web') return true;

  // Check for common recipe site patterns
  const recipePatterns = [
    /recipe/i,
    /cook/i,
    /food/i,
    /allrecipes/i,
    /foodnetwork/i,
    /epicurious/i,
    /seriouseats/i,
    /bonappetit/i,
    /tasty/i,
    /delish/i,
    /simplyrecipes/i,
    /budgetbytes/i,
    /skinnytaste/i,
    /meal/i,
    /dish/i,
    /kitchen/i,
    /chef/i,
    /baking/i,
    /dinner/i,
    /lunch/i,
    /breakfast/i,
  ];

  // Be more permissive - if it's a valid URL, let the user try
  // The extraction process will handle it if it's not a recipe
  if (recipePatterns.some((pattern) => pattern.test(url))) {
    return true;
  }
  
  // Allow any HTTPS URL - let users try importing from any source
  // The AI will determine if there's a recipe or not
  return url.startsWith('https://');
}

/**
 * Get the initial URL when app is opened via share
 */
export async function getInitialSharedUrl(): Promise<string | null> {
  try {
    const url = await Linking.getInitialURL();
    return url;
  } catch (error) {
    console.error('Error getting initial URL:', error);
    return null;
  }
}

/**
 * Subscribe to incoming links
 */
export function subscribeToIncomingLinks(
  callback: (url: string) => void
): () => void {
  const subscription = Linking.addEventListener('url', (event) => {
    callback(event.url);
  });

  return () => {
    subscription.remove();
  };
}

/**
 * Extract text content from Android share intent
 * This is called when the app receives text via share intent
 */
export function extractSharedText(url: string): string | null {
  try {
    // On Android, shared text comes as a query parameter
    const parsed = Linking.parse(url);

    if (parsed.queryParams?.text) {
      return parsed.queryParams.text as string;
    }

    // For deep links with the dinner-plans scheme
    if (parsed.path === 'import' && parsed.queryParams?.url) {
      return parsed.queryParams.url as string;
    }

    return null;
  } catch (error) {
    console.error('Error extracting shared text:', error);
    return null;
  }
}

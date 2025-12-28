import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { detectPlatform } from './recipeImporter';

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

      // Navigate to URL import with the shared URL
      router.push({
        pathname: '/import/url',
        params: { sharedUrl: cleanUrl },
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
 * Check if a URL is likely a recipe source
 */
function isRecipeSourceUrl(url: string): boolean {
  if (!url.startsWith('http')) return false;

  const platform = detectPlatform(url);
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
  ];

  return recipePatterns.some((pattern) => pattern.test(url));
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

    // For deep links with the pantry-pal scheme
    if (parsed.path === 'import' && parsed.queryParams?.url) {
      return parsed.queryParams.url as string;
    }

    return null;
  } catch (error) {
    console.error('Error extracting shared text:', error);
    return null;
  }
}

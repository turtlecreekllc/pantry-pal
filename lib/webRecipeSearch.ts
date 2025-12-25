import { Linking } from 'react-native';

// Open Google search for recipes
export function openGoogleSearch(query: string): void {
  const searchQuery = encodeURIComponent(`${query} recipe`);
  const url = `https://www.google.com/search?q=${searchQuery}`;
  Linking.openURL(url);
}

// Open Pinterest search for recipes
export function openPinterestSearch(query: string): void {
  const searchQuery = encodeURIComponent(`${query} recipe`);
  const url = `https://www.pinterest.com/search/pins/?q=${searchQuery}`;
  Linking.openURL(url);
}

// Open AllRecipes search
export function openAllRecipesSearch(query: string): void {
  const searchQuery = encodeURIComponent(query);
  const url = `https://www.allrecipes.com/search?q=${searchQuery}`;
  Linking.openURL(url);
}

// Open YouTube search for recipe videos
export function openYouTubeSearch(query: string): void {
  const searchQuery = encodeURIComponent(`${query} recipe`);
  const url = `https://www.youtube.com/results?search_query=${searchQuery}`;
  Linking.openURL(url);
}

// Web search options
export const WEB_SEARCH_OPTIONS = [
  { id: 'google', name: 'Google', icon: 'globe-outline', action: openGoogleSearch },
  { id: 'pinterest', name: 'Pinterest', icon: 'logo-pinterest', action: openPinterestSearch },
  { id: 'allrecipes', name: 'AllRecipes', icon: 'restaurant-outline', action: openAllRecipesSearch },
  { id: 'youtube', name: 'YouTube', icon: 'logo-youtube', action: openYouTubeSearch },
] as const;

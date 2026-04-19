import { ProductInfo } from './types';

const OPENFOODFACTS_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
const TIMEOUT_MS = 8000;

interface ImageSearchResult {
  url: string;
  title: string;
  source: string;
}

interface OpenFoodFactsSearchResponse {
  count: number;
  products: Array<{
    product_name?: string;
    brands?: string;
    image_url?: string;
    image_front_url?: string;
    image_front_small_url?: string;
  }>;
}

/**
 * Search OpenFoodFacts for product images by name
 */
async function searchOpenFoodFacts(query: string): Promise<ImageSearchResult[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const params = new URLSearchParams({
      search_terms: query,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: '10',
      fields: 'product_name,brands,image_url,image_front_url,image_front_small_url',
    });
    const response = await fetch(`${OPENFOODFACTS_SEARCH_URL}?${params}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      return [];
    }
    const data: OpenFoodFactsSearchResponse = await response.json();
    const results: ImageSearchResult[] = [];
    for (const product of data.products || []) {
      const imageUrl = product.image_url || product.image_front_url;
      if (imageUrl) {
        results.push({
          url: imageUrl,
          title: [product.product_name, product.brands].filter(Boolean).join(' - '),
          source: 'OpenFoodFacts',
        });
      }
    }
    return results;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('OpenFoodFacts search error:', error);
    return [];
  }
}

/**
 * Search for product images across multiple sources
 * @param query - Product name to search for
 * @returns Array of image results
 */
export async function searchProductImages(query: string): Promise<ImageSearchResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }
  const cleanQuery = query.trim().replace(/^\d+x\s*/i, '');
  const results = await searchOpenFoodFacts(cleanQuery);
  const uniqueResults = results.filter((result, index, self) =>
    index === self.findIndex((r) => r.url === result.url)
  );
  return uniqueResults.slice(0, 12);
}

export type { ImageSearchResult };


import { ProductInfo, OpenFoodFactsResponse, NutritionInfo, ParsedQuantity, Unit } from './types';

const BASE_URL = 'https://world.openfoodfacts.org/api/v2';
const TIMEOUT_MS = 5000;

// Parse quantity string like "500 ml", "1 kg", "12 oz" into value and unit
function parseQuantityString(quantityStr: string | undefined): ParsedQuantity | null {
  if (!quantityStr) return null;

  // Regex to extract number and unit (e.g., "500 ml", "1.5 kg", "12oz")
  const match = quantityStr.match(/(\d+(?:[.,]\d+)?)\s*(ml|l|g|kg|oz|lb|fl\s*oz)?/i);
  if (!match) return null;

  // Parse the numeric value, handling comma as decimal separator
  const value = parseFloat(match[1].replace(',', '.'));
  if (isNaN(value) || value <= 0) return null;

  const unitRaw = (match[2] || '').toLowerCase().replace(/\s/g, '');

  // Map API units to our Unit type
  const unitMap: Record<string, Unit> = {
    'ml': 'ml',
    'l': 'l',
    'g': 'g',
    'kg': 'kg',
    'oz': 'oz',
    'floz': 'oz',
    'lb': 'lb',
  };

  const unit = unitMap[unitRaw];
  if (!unit) return null;

  return { value, unit };
}

export async function getProductByBarcode(barcode: string): Promise<ProductInfo | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(
      `${BASE_URL}/product/${barcode}?fields=product_name,brands,image_url,nutriments,categories_tags,quantity,serving_size,product_quantity`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('Open Food Facts API error:', response.status);
      return null;
    }

    const data: OpenFoodFactsResponse = await response.json();

    if (data.status !== 1 || !data.product) {
      return null;
    }

    const { product } = data;

    const nutrition: NutritionInfo | null = product.nutriments
      ? {
          energy_kcal: product.nutriments['energy-kcal'],
          fat: product.nutriments.fat,
          saturated_fat: product.nutriments['saturated-fat'],
          carbohydrates: product.nutriments.carbohydrates,
          sugars: product.nutriments.sugars,
          fiber: product.nutriments.fiber,
          proteins: product.nutriments.proteins,
          salt: product.nutriments.salt,
          sodium: product.nutriments.sodium,
        }
      : null;

    return {
      barcode,
      name: product.product_name || 'Unknown Product',
      brand: product.brands || null,
      imageUrl: product.image_url || null,
      nutrition,
      categories: product.categories_tags || [],
      productQuantity: product.quantity || null,
      servingSize: product.serving_size || null,
      parsedQuantity: parseQuantityString(product.quantity),
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Open Food Facts API request timed out');
    } else {
      console.error('Open Food Facts API error:', error);
    }
    return null;
  }
}

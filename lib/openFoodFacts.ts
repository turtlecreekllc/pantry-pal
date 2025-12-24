import { ProductInfo, OpenFoodFactsResponse, NutritionInfo } from './types';

const BASE_URL = 'https://world.openfoodfacts.org/api/v2';
const TIMEOUT_MS = 5000;

export async function getProductByBarcode(barcode: string): Promise<ProductInfo | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(
      `${BASE_URL}/product/${barcode}?fields=product_name,brands,image_url,nutriments,categories_tags`,
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

import type { Unit, FillLevel, Location } from './pantry';
import type { ImportedRecipe } from './recipe';

// AI Scanner types
export interface ScannedItem {
  id: string;
  name: string;
  quantity: number; // Total quantity (unitCount * volumeQuantity when both present)
  unit: Unit;
  unitCount?: number; // Number of packages/cans/bottles (e.g., 3 cans)
  volumeQuantity?: number; // Size per unit (e.g., 12 oz per can)
  volumeUnit?: Unit; // Unit for volume (oz, ml, g, etc.)
  brand?: string;
  category?: string;
  confidence: number; // 0-1 confidence score from AI
  status: 'pending' | 'accepted' | 'edited' | 'rejected';
  fillLevel?: FillLevel; // Fill level for container items
  expirationDate?: string; // User-entered expiration date (YYYY-MM-DD)
  imageUrl?: string; // Product image URL from search
  originalData?: {
    name: string;
    quantity: number;
    unit: Unit;
  };
}

export interface ReceiptScanResult {
  items: ScannedItem[];
  storeName?: string;
  date?: string;
  total?: number;
  imageUri: string;
}

export interface PhotoScanResult {
  items: ScannedItem[];
  location: Location;
  imageUri: string;
}

export interface RecipeCardScanResult {
  recipe: Partial<ImportedRecipe>;
  confidence: number;
  originalImage: string;
}

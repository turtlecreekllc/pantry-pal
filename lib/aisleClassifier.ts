import { AISLES, Aisle } from './types';

/**
 * Keywords for each aisle to help classify ingredients
 */
const AISLE_KEYWORDS: Record<Aisle, string[]> = {
  Produce: [
    'apple', 'banana', 'orange', 'lemon', 'lime', 'grapefruit', 'berry', 'berries',
    'strawberry', 'blueberry', 'raspberry', 'grape', 'melon', 'watermelon',
    'lettuce', 'spinach', 'kale', 'arugula', 'cabbage', 'broccoli', 'cauliflower',
    'carrot', 'celery', 'onion', 'garlic', 'potato', 'tomato', 'cucumber',
    'pepper', 'zucchini', 'squash', 'eggplant', 'avocado', 'mushroom',
    'herb', 'cilantro', 'parsley', 'basil', 'mint', 'thyme', 'rosemary',
    'ginger', 'jalapeño', 'serrano', 'scallion', 'shallot', 'leek',
    'asparagus', 'artichoke', 'beet', 'corn', 'pea', 'bean', 'fresh',
  ],
  Dairy: [
    'milk', 'cream', 'butter', 'cheese', 'yogurt', 'sour cream', 'cottage cheese',
    'cheddar', 'mozzarella', 'parmesan', 'feta', 'brie', 'gouda', 'swiss',
    'ricotta', 'cream cheese', 'half and half', 'whipping cream', 'buttermilk',
    'egg', 'eggs', 'margarine', 'ghee', 'kefir',
  ],
  'Meat & Seafood': [
    'chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'veal',
    'steak', 'ground beef', 'ground turkey', 'bacon', 'sausage', 'ham',
    'prosciutto', 'salami', 'pepperoni', 'hot dog', 'bratwurst',
    'ribs', 'roast', 'tenderloin', 'filet', 'sirloin', 'ribeye',
    'drumstick', 'thigh', 'breast', 'wing', 'liver', 'organ',
    'fish', 'salmon', 'tuna', 'cod', 'tilapia', 'halibut', 'trout',
    'bass', 'snapper', 'mahi', 'swordfish', 'catfish', 'anchovy',
    'shrimp', 'prawn', 'lobster', 'crab', 'scallop', 'clam', 'mussel',
    'oyster', 'calamari', 'squid', 'octopus', 'crawfish', 'crayfish',
    'seafood', 'shellfish',
  ],
  Bakery: [
    'bread', 'baguette', 'ciabatta', 'sourdough', 'roll', 'bun',
    'croissant', 'muffin', 'bagel', 'english muffin', 'pita',
    'tortilla', 'naan', 'flatbread', 'focaccia', 'brioche',
    'cake', 'cupcake', 'pie', 'pastry', 'donut', 'doughnut',
    'cookie', 'brownie', 'danish', 'scone',
    'flour', 'all-purpose flour', 'bread flour', 'cake flour',
    'sugar', 'brown sugar', 'powdered sugar', 'confectioner',
    'baking soda', 'baking powder', 'yeast', 'cream of tartar',
    'chocolate chip', 'cocoa', 'chocolate bar', 'white chocolate',
    'vanilla extract', 'almond extract', 'food coloring',
    'sprinkle', 'frosting', 'icing', 'fondant',
    'coconut flake', 'almond flour', 'cornstarch',
  ],
  Frozen: [
    'frozen', 'ice cream', 'gelato', 'sorbet', 'popsicle',
    'frozen pizza', 'frozen dinner', 'frozen vegetable', 'frozen fruit',
    'frozen fish', 'frozen chicken', 'frozen shrimp',
    'frozen waffle', 'frozen pancake', 'frozen breakfast',
    'ice', 'puff pastry', 'phyllo', 'frozen pie',
  ],
  'Canned Goods': [
    'canned', 'can of', 'tin of', 'jarred',
    'tomato sauce', 'tomato paste', 'crushed tomato', 'diced tomato',
    'canned bean', 'canned corn', 'canned pea', 'canned vegetable',
    'canned tuna', 'canned salmon', 'canned chicken',
    'soup', 'broth', 'stock', 'bouillon',
    'coconut milk', 'evaporated milk', 'condensed milk',
    'olive', 'pickle', 'caper', 'artichoke heart',
  ],
  'Pasta & Grains': [
    'pasta', 'spaghetti', 'penne', 'linguine', 'fettuccine', 'rigatoni',
    'macaroni', 'orzo', 'couscous', 'gnocchi', 'ravioli', 'tortellini',
    'rice', 'basmati', 'jasmine', 'arborio', 'wild rice', 'brown rice',
    'quinoa', 'barley', 'farro', 'bulgur', 'millet', 'buckwheat',
    'oat', 'oatmeal', 'granola', 'cereal', 'cornmeal',
    'noodle', 'ramen', 'udon', 'soba', 'rice noodle',
  ],
  Spices: [
    'spice', 'seasoning', 'salt', 'pepper', 'paprika', 'cumin',
    'coriander', 'turmeric', 'cinnamon', 'nutmeg', 'clove', 'allspice',
    'cardamom', 'ginger powder', 'garlic powder', 'onion powder',
    'oregano', 'thyme', 'rosemary', 'sage', 'bay leaf', 'dill',
    'cayenne', 'chili powder', 'curry', 'garam masala', 'za\'atar',
    'vanilla', 'extract', 'saffron', 'fennel seed', 'mustard seed',
  ],
  Condiments: [
    'sauce', 'ketchup', 'mustard', 'mayonnaise', 'mayo',
    'soy sauce', 'teriyaki', 'hoisin', 'fish sauce', 'oyster sauce',
    'hot sauce', 'sriracha', 'tabasco', 'salsa', 'pico',
    'vinegar', 'balsamic', 'red wine vinegar', 'apple cider vinegar',
    'oil', 'olive oil', 'vegetable oil', 'canola oil', 'sesame oil',
    'dressing', 'ranch', 'italian dressing', 'caesar',
    'honey', 'maple syrup', 'molasses', 'agave',
    'jam', 'jelly', 'preserve', 'marmalade', 'peanut butter', 'nutella',
  ],
  Beverages: [
    'water', 'sparkling water', 'soda', 'cola', 'sprite',
    'juice', 'orange juice', 'apple juice', 'grape juice', 'cranberry',
    'coffee', 'tea', 'espresso', 'latte',
    'beer', 'wine', 'champagne', 'vodka', 'rum', 'whiskey', 'gin',
    'energy drink', 'sports drink', 'gatorade',
    'milk alternative', 'almond milk', 'oat milk', 'soy milk',
  ],
  Snacks: [
    'chip', 'chips', 'crisp', 'crisps', 'tortilla chip', 'potato chip',
    'pretzel', 'popcorn', 'cracker', 'goldfish',
    'nut', 'peanut', 'almond', 'cashew', 'walnut', 'pistachio',
    'trail mix', 'dried fruit', 'raisin', 'cranberry dried',
    'candy', 'chocolate', 'gummy', 'licorice',
    'granola bar', 'protein bar', 'energy bar',
    'jerky', 'beef jerky', 'slim jim',
  ],
  Other: [],
};

/**
 * Classify an ingredient into a store aisle
 */
export function classifyAisle(ingredientName: string): Aisle {
  const normalized = ingredientName.toLowerCase().trim();

  // Check each aisle's keywords
  for (const aisle of AISLES) {
    if (aisle === 'Other') continue;

    const keywords = AISLE_KEYWORDS[aisle];
    for (const keyword of keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        return aisle;
      }
    }
  }

  return 'Other';
}

/**
 * Get the sort order for aisles (typical supermarket layout)
 */
export function getAisleSortOrder(): Aisle[] {
  return [
    'Produce',
    'Bakery',
    'Dairy',
    'Meat & Seafood',
    'Frozen',
    'Pasta & Grains',
    'Canned Goods',
    'Condiments',
    'Spices',
    'Snacks',
    'Beverages',
    'Other',
  ];
}

/**
 * Sort items by aisle in typical supermarket order
 */
export function sortByAisle<T extends { aisle?: Aisle | null }>(items: T[]): T[] {
  const aisleOrder = getAisleSortOrder();

  return [...items].sort((a, b) => {
    const aisleA = a.aisle || 'Other';
    const aisleB = b.aisle || 'Other';

    const indexA = aisleOrder.indexOf(aisleA);
    const indexB = aisleOrder.indexOf(aisleB);

    return indexA - indexB;
  });
}

/**
 * Group items by aisle
 */
export function groupByAisle<T extends { aisle?: Aisle | null }>(
  items: T[]
): Map<Aisle, T[]> {
  const groups = new Map<Aisle, T[]>();

  // Initialize all aisles
  for (const aisle of getAisleSortOrder()) {
    groups.set(aisle, []);
  }

  // Group items
  for (const item of items) {
    const aisle = item.aisle || 'Other';
    const group = groups.get(aisle) || [];
    group.push(item);
    groups.set(aisle, group);
  }

  // Remove empty groups
  for (const [aisle, group] of groups) {
    if (group.length === 0) {
      groups.delete(aisle);
    }
  }

  return groups;
}

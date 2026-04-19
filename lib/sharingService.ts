import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { Share, Platform } from 'react-native';
import { ExtendedRecipe, RecipeIngredient, Cookbook } from './types';

/**
 * Check if sharing is available on this platform
 */
export async function isSharingAvailable(): Promise<boolean> {
  return await Sharing.isAvailableAsync();
}

/**
 * Format recipe as plain text
 */
export function formatRecipeAsText(recipe: {
  name: string;
  ingredients: RecipeIngredient[];
  instructions: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  source?: string;
}): string {
  const lines: string[] = [];

  // Title
  lines.push(`${recipe.name}`);
  lines.push('='.repeat(recipe.name.length));
  lines.push('');

  // Meta info
  const meta: string[] = [];
  if (recipe.prepTime) meta.push(`Prep: ${recipe.prepTime} min`);
  if (recipe.cookTime) meta.push(`Cook: ${recipe.cookTime} min`);
  if (recipe.servings) meta.push(`Servings: ${recipe.servings}`);
  if (meta.length > 0) {
    lines.push(meta.join(' | '));
    lines.push('');
  }

  // Ingredients
  lines.push('INGREDIENTS');
  lines.push('-----------');
  recipe.ingredients.forEach((ing) => {
    const measure = ing.measure ? `${ing.measure} ` : '';
    lines.push(`• ${measure}${ing.ingredient}`);
  });
  lines.push('');

  // Instructions
  lines.push('INSTRUCTIONS');
  lines.push('------------');
  const steps = recipe.instructions.split('\n').filter(Boolean);
  steps.forEach((step, index) => {
    // Remove existing step numbers (e.g., "1. ", "2) ", "Step 1: ") to avoid duplication
    const cleanStep = step.trim().replace(/^(\d+[\.\)\:]?\s*|Step\s*\d+[\.\:\)]*\s*)/i, '');
    lines.push(`${index + 1}. ${cleanStep}`);
  });
  lines.push('');

  // Source
  if (recipe.source) {
    lines.push(`Source: ${recipe.source}`);
    lines.push('');
  }

  lines.push('---');
  lines.push('Shared from DinnerPlans');

  return lines.join('\n');
}

/**
 * Share recipe as text via native share sheet
 */
export async function shareRecipeAsText(recipe: {
  name: string;
  ingredients: RecipeIngredient[];
  instructions: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  source?: string;
}): Promise<boolean> {
  const text = formatRecipeAsText(recipe);

  try {
    const result = await Share.share({
      message: text,
      title: recipe.name,
    });

    return result.action === Share.sharedAction;
  } catch (error) {
    console.error('Error sharing recipe:', error);
    return false;
  }
}

/**
 * Generate HTML for recipe PDF
 */
function generateRecipeHTML(recipe: {
  name: string;
  description?: string;
  ingredients: RecipeIngredient[];
  instructions: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  source?: string;
  imageUrl?: string;
}): string {
  const meta: string[] = [];
  if (recipe.prepTime) meta.push(`<span>Prep: ${recipe.prepTime} min</span>`);
  if (recipe.cookTime) meta.push(`<span>Cook: ${recipe.cookTime} min</span>`);
  if (recipe.servings) meta.push(`<span>Servings: ${recipe.servings}</span>`);

  // Remove existing step numbers to avoid duplication in ordered list
  const steps = recipe.instructions.split('\n').filter(Boolean).map(step => 
    step.trim().replace(/^(\d+[\.\)\:]?\s*|Step\s*\d+[\.\:\)]*\s*)/i, '')
  );

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
        }
        h1 {
          font-size: 28px;
          margin-bottom: 8px;
          color: #2e7d32;
        }
        .description {
          color: #666;
          font-style: italic;
          margin-bottom: 16px;
        }
        .meta {
          display: flex;
          gap: 20px;
          margin-bottom: 24px;
          padding: 12px;
          background: #f5f5f5;
          border-radius: 8px;
        }
        .meta span {
          font-size: 14px;
          color: #666;
        }
        .image {
          width: 100%;
          max-height: 300px;
          object-fit: cover;
          border-radius: 8px;
          margin-bottom: 24px;
        }
        h2 {
          font-size: 20px;
          color: #333;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 2px solid #4CAF50;
        }
        .ingredients {
          margin-bottom: 32px;
        }
        .ingredients ul {
          list-style: none;
        }
        .ingredients li {
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        .ingredients li:last-child {
          border-bottom: none;
        }
        .instructions ol {
          padding-left: 0;
          counter-reset: step;
          list-style: none;
        }
        .instructions li {
          padding: 12px 0 12px 48px;
          position: relative;
          border-bottom: 1px solid #eee;
        }
        .instructions li:before {
          content: counter(step);
          counter-increment: step;
          position: absolute;
          left: 0;
          width: 32px;
          height: 32px;
          background: #4CAF50;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
        }
        .source {
          margin-top: 32px;
          padding-top: 16px;
          border-top: 1px solid #e0e0e0;
          font-size: 12px;
          color: #999;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #999;
        }
      </style>
    </head>
    <body>
      <h1>${recipe.name}</h1>
      ${recipe.description ? `<p class="description">${recipe.description}</p>` : ''}
      ${meta.length > 0 ? `<div class="meta">${meta.join('')}</div>` : ''}
      ${recipe.imageUrl ? `<img class="image" src="${recipe.imageUrl}" alt="${recipe.name}">` : ''}

      <div class="ingredients">
        <h2>Ingredients</h2>
        <ul>
          ${recipe.ingredients
      .map((ing) => `<li>${ing.measure ? `${ing.measure} ` : ''}${ing.ingredient}</li>`)
      .join('')}
        </ul>
      </div>

      <div class="instructions">
        <h2>Instructions</h2>
        <ol>
          ${steps.map((step) => `<li>${step.trim()}</li>`).join('')}
        </ol>
      </div>

      ${recipe.source ? `<div class="source">Source: ${recipe.source}</div>` : ''}

      <div class="footer">
        Created with DinnerPlans
      </div>
    </body>
    </html>
  `;
}

/**
 * Export recipe as PDF
 */
export async function exportRecipeToPDF(recipe: {
  name: string;
  description?: string;
  ingredients: RecipeIngredient[];
  instructions: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  source?: string;
  imageUrl?: string;
}): Promise<string | null> {
  try {
    const html = generateRecipeHTML(recipe);

    // Generate PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Move to a more accessible location with proper filename
    const filename = `${recipe.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    const newUri = `${FileSystem.documentDirectory}${filename}`;

    await FileSystem.moveAsync({
      from: uri,
      to: newUri,
    });

    return newUri;
  } catch (error) {
    console.error('Error exporting PDF:', error);
    return null;
  }
}

/**
 * Share recipe as PDF
 */
export async function shareRecipeAsPDF(recipe: {
  name: string;
  description?: string;
  ingredients: RecipeIngredient[];
  instructions: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  source?: string;
  imageUrl?: string;
}): Promise<boolean> {
  const pdfUri = await exportRecipeToPDF(recipe);
  if (!pdfUri) return false;

  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Share ${recipe.name}`,
        UTI: 'com.adobe.pdf',
      });
      return true;
    } else {
      console.log('Sharing not available');
      return false;
    }
  } catch (error) {
    console.error('Error sharing PDF:', error);
    return false;
  }
}

/**
 * Generate cookbook HTML with multiple recipes
 */
function generateCookbookHTML(
  cookbookName: string,
  recipes: Array<{
    name: string;
    description?: string;
    ingredients: RecipeIngredient[];
    instructions: string;
    prepTime?: number;
    cookTime?: number;
    servings?: number;
  }>
): string {
  const recipePages = recipes.map((recipe, index) => {
    const meta: string[] = [];
    if (recipe.prepTime) meta.push(`Prep: ${recipe.prepTime} min`);
    if (recipe.cookTime) meta.push(`Cook: ${recipe.cookTime} min`);
    if (recipe.servings) meta.push(`Servings: ${recipe.servings}`);

    // Remove existing step numbers to avoid duplication in ordered list
    const steps = recipe.instructions.split('\n').filter(Boolean).map(step => 
      step.trim().replace(/^(\d+[\.\)\:]?\s*|Step\s*\d+[\.\:\)]*\s*)/i, '')
    );

    return `
      <div class="recipe" ${index > 0 ? 'style="page-break-before: always;"' : ''}>
        <h2>${recipe.name}</h2>
        ${recipe.description ? `<p class="description">${recipe.description}</p>` : ''}
        ${meta.length > 0 ? `<p class="meta">${meta.join(' • ')}</p>` : ''}

        <div class="section">
          <h3>Ingredients</h3>
          <ul>
            ${recipe.ingredients
        .map((ing) => `<li>${ing.measure ? `${ing.measure} ` : ''}${ing.ingredient}</li>`)
        .join('')}
          </ul>
        </div>

        <div class="section">
          <h3>Instructions</h3>
          <ol>
            ${steps.map((step) => `<li>${step.trim()}</li>`).join('')}
          </ol>
        </div>
      </div>
    `;
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.5;
          color: #333;
          padding: 40px;
        }
        .cover {
          text-align: center;
          padding: 100px 40px;
          page-break-after: always;
        }
        .cover h1 {
          font-size: 48px;
          color: #2e7d32;
          margin-bottom: 20px;
        }
        .cover p {
          font-size: 18px;
          color: #666;
        }
        .toc {
          page-break-after: always;
        }
        .toc h2 {
          font-size: 24px;
          margin-bottom: 24px;
          color: #2e7d32;
        }
        .toc ul {
          list-style: none;
        }
        .toc li {
          padding: 8px 0;
          border-bottom: 1px dotted #ccc;
        }
        .recipe h2 {
          font-size: 24px;
          color: #2e7d32;
          margin-bottom: 8px;
        }
        .description {
          color: #666;
          font-style: italic;
          margin-bottom: 12px;
        }
        .meta {
          color: #999;
          font-size: 14px;
          margin-bottom: 24px;
        }
        .section {
          margin-bottom: 24px;
        }
        h3 {
          font-size: 18px;
          margin-bottom: 12px;
          color: #333;
        }
        ul, ol {
          padding-left: 24px;
        }
        li {
          padding: 4px 0;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #999;
        }
      </style>
    </head>
    <body>
      <div class="cover">
        <h1>${cookbookName}</h1>
        <p>${recipes.length} Recipes</p>
        <p style="margin-top: 40px;">Created with DinnerPlans</p>
      </div>

      <div class="toc">
        <h2>Table of Contents</h2>
        <ul>
          ${recipes.map((r, i) => `<li>${i + 1}. ${r.name}</li>`).join('')}
        </ul>
      </div>

      ${recipePages.join('')}

      <div class="footer">
        Created with DinnerPlans
      </div>
    </body>
    </html>
  `;
}

/**
 * Export cookbook as PDF
 */
export async function exportCookbookToPDF(
  cookbookName: string,
  recipes: Array<{
    name: string;
    description?: string;
    ingredients: RecipeIngredient[];
    instructions: string;
    prepTime?: number;
    cookTime?: number;
    servings?: number;
  }>
): Promise<string | null> {
  try {
    const html = generateCookbookHTML(cookbookName, recipes);

    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    const filename = `${cookbookName.replace(/[^a-zA-Z0-9]/g, '_')}_Cookbook.pdf`;
    const newUri = `${FileSystem.documentDirectory}${filename}`;

    await FileSystem.moveAsync({
      from: uri,
      to: newUri,
    });

    return newUri;
  } catch (error) {
    console.error('Error exporting cookbook PDF:', error);
    return null;
  }
}

/**
 * Share cookbook as PDF
 */
export async function shareCookbookAsPDF(
  cookbookName: string,
  recipes: Array<{
    name: string;
    description?: string;
    ingredients: RecipeIngredient[];
    instructions: string;
    prepTime?: number;
    cookTime?: number;
    servings?: number;
  }>
): Promise<boolean> {
  const pdfUri = await exportCookbookToPDF(cookbookName, recipes);
  if (!pdfUri) return false;

  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Share ${cookbookName} Cookbook`,
        UTI: 'com.adobe.pdf',
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error sharing cookbook PDF:', error);
    return false;
  }
}

/**
 * Print recipe directly
 */
export async function printRecipe(recipe: {
  name: string;
  description?: string;
  ingredients: RecipeIngredient[];
  instructions: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  source?: string;
  imageUrl?: string;
}): Promise<void> {
  const html = generateRecipeHTML(recipe);
  await Print.printAsync({ html });
}

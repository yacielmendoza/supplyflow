import type { Translations } from './translations';
import type { Category } from '../types';

export const PRODUCT_CATEGORIES: Category[] = [
  'INGREDIENTS',
  'SNACKS',
  'BEVERAGES',
  'MIXERS',
  'CANDY',
  'CHEMICALS',
  'PAPER / DISPOSABLES',
  'ALCOHOL',
  'SUPPLIES',
];

export function formatCleanName(name?: string | null): string {
  if (!name) return '';
  return name.replace(/\s*\([^)]*\)/g, '').trim();
}

export function formatCategoryName(category: string, t: Translations): string {
  switch (category) {
    case 'INGREDIENTS':
      return t.categoryIngredients;
    case 'SNACKS':
      return t.categorySnacks;
    case 'BEVERAGES':
      return t.categoryBeverages;
    case 'MIXERS':
      return t.categoryMixers;
    case 'CANDY':
      return t.categoryCandy;
    case 'CHEMICALS':
      return t.categoryChemicals;
    case 'PAPER / DISPOSABLES':
      return t.categoryPaperDisposables;
    case 'ALCOHOL':
      return t.categoryAlcohol;
    case 'SUPPLIES':
      return t.categorySupplies;
    default:
      return category;
  }
}

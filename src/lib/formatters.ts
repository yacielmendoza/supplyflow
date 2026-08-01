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

// Compile-time guard: if `Category` (types.ts) ever gains a member missing
// from PRODUCT_CATEGORIES above, this line fails to type-check — the two
// lists used to be able to drift silently in opposite directions.
type AssertNoMissingCategory<T extends readonly Category[]> = Category extends T[number] ? true : never;
const _allCategoriesCovered: AssertNoMissingCategory<typeof PRODUCT_CATEGORIES> = true;
void _allCategoriesCovered;

export function formatCleanName(name?: string | null): string {
  if (!name) return '';
  return name.replace(/\s*\([^)]*\)/g, '').trim();
}

export function formatRestaurantType(type: string, t: Translations): string {
  switch (type) {
    case 'Food Truck':
      return t.adminTypeFoodTruck;
    case 'Restaurante':
      return t.adminTypeRestaurant;
    case 'Cafe':
      return t.adminTypeCafe;
    case 'Bistro':
      return t.adminTypeBistro;
    default:
      return type;
  }
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

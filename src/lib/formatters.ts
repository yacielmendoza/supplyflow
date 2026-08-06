import type { Translations } from './translations';
import type { Category, UnitType } from '../types';

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

const UNIT_KEY_MAP: Record<UnitType, keyof Translations> = {
  Paquete: 'unitPaquete',
  Caja: 'unitCaja',
  Tubo: 'unitTubo',
  Bolsa: 'unitBolsa',
  Libra: 'unitLibra',
  Galón: 'unitGalon',
  Botella: 'unitBotella',
  Lata: 'unitLata',
  Unidad: 'unitUnidad',
  Tanque: 'unitTanque',
  Rollo: 'unitRollo',
  Atado: 'unitAtado',
  Cubeta: 'unitCubeta',
  'Caja / Cartón': 'unitCajaCarton',
};

// Dedicated plural keys, not a suffix rule — Spanish/English pluralization
// (Galón→Galones, Box→Boxes) doesn't follow a blind "+s", which is exactly
// the bug this replaces (formatUnitName(unit, t) + 's' produced "Unidads").
const UNIT_PLURAL_KEY_MAP: Record<UnitType, keyof Translations> = {
  Paquete: 'unitPaquetePlural',
  Caja: 'unitCajaPlural',
  Tubo: 'unitTuboPlural',
  Bolsa: 'unitBolsaPlural',
  Libra: 'unitLibraPlural',
  Galón: 'unitGalonPlural',
  Botella: 'unitBotellaPlural',
  Lata: 'unitLataPlural',
  Unidad: 'unitUnidadPlural',
  Tanque: 'unitTanquePlural',
  Rollo: 'unitRolloPlural',
  Atado: 'unitAtadoPlural',
  Cubeta: 'unitCubetaPlural',
  'Caja / Cartón': 'unitCajaCartonPlural',
};

// `count` defaults to a value that renders the singular form, for call sites
// that display a unit name with no specific quantity attached (e.g. a unit
// picker option). Pass the real quantity wherever one is being formatted
// alongside a number to get correct pluralization.
export function formatUnitName(unit: string, t: Translations, count = 1): string {
  const keyMap = count === 1 ? UNIT_KEY_MAP : UNIT_PLURAL_KEY_MAP;
  const key = keyMap[unit as UnitType];
  return key ? t[key] : unit;
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

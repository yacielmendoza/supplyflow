export function formatCleanName(name?: string | null): string {
  if (!name) return '';
  return name.replace(/\s*\([^)]*\)/g, '').trim();
}

export function formatCategoryName(category: string): string {
  switch (category) {
    case 'INGREDIENTS':
      return 'Ingredientes';
    case 'SNACKS':
      return 'Snacks & Botanas';
    case 'BEVERAGES':
      return 'Bebidas';
    case 'MIXERS':
      return 'Mezcladores';
    case 'CANDY':
      return 'Dulces & Confitería';
    case 'CHEMICALS':
      return 'Limpieza & Químicos';
    case 'PAPER / DISPOSABLES':
      return 'Desechables';
    case 'ALCOHOL':
      return 'Licores & Cervezas';
    case 'SUPPLIES':
      return 'Insumos Generales';
    default:
      return category;
  }
}

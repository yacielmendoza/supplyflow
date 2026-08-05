/**
 * Tiny className joiner (clsx-lite). Filters falsy values and joins with spaces.
 * Kept dependency-free; callers own class ordering so no conflict-merge is needed.
 */
export type ClassValue = string | number | false | null | undefined;

export function cn(...parts: ClassValue[]): string {
  return parts.filter(Boolean).join(' ');
}

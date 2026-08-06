export interface SupabasePublicConfig {
  url: string;
  publishableKey: string;
}

export type SupabaseConfigResult =
  | { available: true; config: SupabasePublicConfig }
  | { available: false; missingKeys: string[] };

export type PublicEnvironment = Readonly<{
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}>;

export function resolveSupabaseConfig(environment: PublicEnvironment): SupabaseConfigResult {
  const url = environment.VITE_SUPABASE_URL?.trim();
  const publishableKey = environment.VITE_SUPABASE_ANON_KEY?.trim();
  const missingKeys: string[] = [];

  if (!url) missingKeys.push('VITE_SUPABASE_URL');
  if (!publishableKey) missingKeys.push('VITE_SUPABASE_ANON_KEY');

  if (!url || !publishableKey) {
    return { available: false, missingKeys };
  }

  return {
    available: true,
    config: { url, publishableKey },
  };
}

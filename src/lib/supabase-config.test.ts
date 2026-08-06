import { describe, expect, it } from 'vitest';
import { resolveSupabaseConfig } from './supabase-config';

describe('resolveSupabaseConfig', () => {
  it('blocks initialization when required public variables are absent', () => {
    expect(resolveSupabaseConfig({})).toEqual({
      available: false,
      missingKeys: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
    });
  });

  it('returns only the configured public connection values', () => {
    expect(resolveSupabaseConfig({
      VITE_SUPABASE_URL: 'https://project.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'sb_publishable_example',
    })).toEqual({
      available: true,
      config: {
        url: 'https://project.supabase.co',
        publishableKey: 'sb_publishable_example',
      },
    });
  });
});

import { describe, expect, it } from 'vitest';
import { createSupabaseClient } from './supabase';

describe('createSupabaseClient', () => {
  it('refuses to create a client when public configuration is unavailable', () => {
    expect(() => createSupabaseClient({
      available: false,
      missingKeys: ['VITE_SUPABASE_URL'],
    })).toThrow('SupplyFlow no está configurado para conectarse a Supabase.');
  });

  it('creates a client from explicit public configuration', () => {
    expect(createSupabaseClient({
      available: true,
      config: {
        url: 'https://project.supabase.co',
        publishableKey: 'sb_publishable_example',
      },
    })).toBeDefined();
  });
});

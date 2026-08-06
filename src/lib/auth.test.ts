import { describe, expect, it } from 'vitest';
import {
  AuthenticationError,
  normalizeProfile,
  signInWithPassword,
  type PasswordSignInClient,
} from './auth';

describe('signInWithPassword', () => {
  it('rejects blank credentials before calling the authentication provider', async () => {
    const client: PasswordSignInClient = {
      auth: {
        signInWithPassword: async () => ({ error: null }),
      },
    };

    await expect(signInWithPassword(client, ' ', 'password')).rejects.toThrow(
      'Email y contraseña son obligatorios.'
    );
  });

  it('returns a safe error when the authentication provider rejects valid credentials', async () => {
    const client: PasswordSignInClient = {
      auth: {
        signInWithPassword: async () => ({ error: { message: 'Invalid login credentials' } }),
      },
    };

    await expect(signInWithPassword(client, 'cook@example.com', 'password')).rejects.toEqual(
      new AuthenticationError('No fue posible iniciar sesión. Verifica tus credenciales.')
    );
  });
});

describe('normalizeProfile', () => {
  it('accepts a provisioned profile with an application role', () => {
    expect(normalizeProfile({
      id: 'd4e5c707-a0e4-454e-b663-d2e49a2bdb0f',
      organization_id: '014c9a26-0e0d-46fb-8ed7-d6dbd9328d61',
      role: 'cook',
      full_name: 'Cocina Central',
      email: 'cook@example.com',
    })).toEqual({
      id: 'd4e5c707-a0e4-454e-b663-d2e49a2bdb0f',
      organizationId: '014c9a26-0e0d-46fb-8ed7-d6dbd9328d61',
      role: 'cook',
      fullName: 'Cocina Central',
      email: 'cook@example.com',
    });
  });

  it('rejects an unprovisioned profile instead of assigning a fallback role', () => {
    expect(() => normalizeProfile({
      id: 'd4e5c707-a0e4-454e-b663-d2e49a2bdb0f',
      organization_id: null,
      role: null,
      full_name: '',
      email: 'cook@example.com',
    })).toThrow('Tu cuenta aún no tiene una organización y rol asignados.');
  });
});

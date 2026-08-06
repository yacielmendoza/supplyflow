export type AppRole = 'admin' | 'buyer' | 'cook';

export interface AuthenticatedProfile {
  id: string;
  organizationId: string;
  role: AppRole;
  fullName: string;
  email: string;
}

export interface PasswordSignInClient {
  auth: {
    signInWithPassword(credentials: { email: string; password: string }): Promise<{
      error: { message: string } | null;
    }>;
  };
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ProfileProvisioningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProfileProvisioningError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAppRole(value: unknown): value is AppRole {
  return value === 'admin' || value === 'buyer' || value === 'cook';
}

function requiredString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

export async function signInWithPassword(
  client: PasswordSignInClient,
  email: string,
  password: string
): Promise<void> {
  const normalizedEmail = email.trim();
  if (!normalizedEmail || !password) {
    throw new AuthenticationError('Email y contraseña son obligatorios.');
  }

  const { error } = await client.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    throw new AuthenticationError('No fue posible iniciar sesión. Verifica tus credenciales.');
  }
}

export function normalizeProfile(value: unknown): AuthenticatedProfile {
  if (!isRecord(value)) {
    throw new ProfileProvisioningError('Tu cuenta aún no tiene un perfil válido.');
  }

  const id = requiredString(value.id);
  const organizationId = requiredString(value.organization_id);
  const email = requiredString(value.email);

  if (!id || !organizationId || !email || !isAppRole(value.role)) {
    throw new ProfileProvisioningError('Tu cuenta aún no tiene una organización y rol asignados.');
  }

  return {
    id,
    organizationId,
    role: value.role,
    fullName: typeof value.full_name === 'string' ? value.full_name : '',
    email,
  };
}

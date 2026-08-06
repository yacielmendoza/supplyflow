import { describe, expect, it } from 'vitest';
import { toOperationalDataError } from './api';

describe('toOperationalDataError', () => {
  it('turns an unavailable persistence layer into an explicit operational error', () => {
    const error = toOperationalDataError(new Error('network unavailable'));

    expect(error.name).toBe('OperationalDataError');
    expect(error.message).toBe('No fue posible cargar las solicitudes. Revisa tu conexión e inténtalo de nuevo.');
  });
});

import { describe, expect, it } from 'vitest';
import { canTransitionRequest, requestStatusLabel, validateRequestItems } from './operations';

describe('request workflow rules', () => {
  it('allows only the defined forward lifecycle', () => {
    expect(canTransitionRequest('pending', 'assigned')).toBe(true);
    expect(canTransitionRequest('assigned', 'in_purchase')).toBe(true);
    expect(canTransitionRequest('in_purchase', 'purchased')).toBe(true);
    expect(canTransitionRequest('purchased', 'delivered')).toBe(true);
    expect(canTransitionRequest('delivered', 'completed')).toBe(true);
    expect(canTransitionRequest('pending', 'completed')).toBe(false);
  });

  it('uses Spanish labels without storing presentation values in the database', () => {
    expect(requestStatusLabel('in_purchase')).toBe('En compra');
  });

  it('rejects empty and invalid request items before an RPC call', () => {
    expect(validateRequestItems([])).toBe('Agrega al menos un artículo.');
    expect(validateRequestItems([{ productId: 'p-1', quantity: 0 }])).toBe('Todas las cantidades deben ser mayores que cero.');
    expect(validateRequestItems([{ productId: 'p-1', quantity: 2 }])).toBeNull();
  });
});

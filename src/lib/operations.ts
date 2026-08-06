export type OperationalRequestStatus =
  | 'pending'
  | 'assigned'
  | 'in_purchase'
  | 'purchased'
  | 'delivered'
  | 'completed';

export interface RequestDraftItem {
  productId: string;
  quantity: number;
  currentStock?: number;
  note?: string;
}

const transitionMap: Record<OperationalRequestStatus, OperationalRequestStatus | null> = {
  pending: 'assigned',
  assigned: 'in_purchase',
  in_purchase: 'purchased',
  purchased: 'delivered',
  delivered: 'completed',
  completed: null,
};

const statusLabels: Record<OperationalRequestStatus, string> = {
  pending: 'Pendiente',
  assigned: 'Asignada',
  in_purchase: 'En compra',
  purchased: 'Comprada',
  delivered: 'Entregada',
  completed: 'Completada',
};

export function canTransitionRequest(
  current: OperationalRequestStatus,
  next: OperationalRequestStatus
): boolean {
  return transitionMap[current] === next;
}

export function nextRequestStatus(current: OperationalRequestStatus): OperationalRequestStatus | null {
  return transitionMap[current];
}

export function requestStatusLabel(status: OperationalRequestStatus): string {
  return statusLabels[status];
}

export function validateRequestItems(items: RequestDraftItem[]): string | null {
  if (items.length === 0) return 'Agrega al menos un artículo.';
  if (items.some((item) => !item.productId || !Number.isFinite(item.quantity) || item.quantity <= 0)) {
    return 'Todas las cantidades deben ser mayores que cero.';
  }
  return null;
}

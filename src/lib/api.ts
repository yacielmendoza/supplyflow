import { Restaurant, Product, SupplyRequest, UserProfile, RequestStatus } from '../types';

const API_BASE = '/api';

export async function fetchRestaurants(): Promise<Restaurant[]> {
  try {
    const res = await fetch(`${API_BASE}/restaurants`);
    if (!res.ok) throw new Error('Error al cargar restaurantes');
    return await res.json();
  } catch (err) {
    console.error('API Error, falling back:', err);
    return [];
  }
}

export async function fetchUsers(): Promise<UserProfile[]> {
  try {
    const res = await fetch(`${API_BASE}/users`);
    if (!res.ok) throw new Error('Error al cargar usuarios');
    return await res.json();
  } catch (err) {
    return [];
  }
}

export async function fetchProducts(restaurantId?: string): Promise<Product[]> {
  try {
    const url = restaurantId
      ? `${API_BASE}/products?restaurantId=${restaurantId}`
      : `${API_BASE}/products`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al cargar productos');
    return await res.json();
  } catch (err) {
    return [];
  }
}

export async function createProduct(product: Omit<Product, 'id' | 'updatedAt'>): Promise<Product> {
  const res = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  });
  return await res.json();
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return await res.json();
}

export async function deleteProduct(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' });
  return res.ok;
}

export async function fetchSupplyRequests(restaurantId?: string, status?: string): Promise<SupplyRequest[]> {
  try {
    let url = `${API_BASE}/requests?`;
    if (restaurantId) url += `restaurantId=${restaurantId}&`;
    if (status) url += `status=${status}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al cargar solicitudes');
    return await res.json();
  } catch (err) {
    return [];
  }
}

export async function submitDailyChecklist(
  restaurantId: string,
  userId: string,
  stockReadings: Record<string, number>,
  notes?: string,
  urgent?: boolean
): Promise<{ success: boolean; replenishmentCount: number; request: SupplyRequest | null }> {
  const res = await fetch(`${API_BASE}/checklist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ restaurantId, userId, stockReadings, notes, urgent }),
  });
  return await res.json();
}

export async function claimSupplyRequest(requestId: string, buyerId: string): Promise<SupplyRequest> {
  const res = await fetch(`${API_BASE}/requests/${requestId}/claim`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ buyerId }),
  });
  return await res.json();
}

export async function updateRequestStatus(
  requestId: string,
  status: RequestStatus,
  buyerId?: string
): Promise<{ request: SupplyRequest; newPendingRequest?: SupplyRequest | null }> {
  const res = await fetch(`${API_BASE}/requests/${requestId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, buyerId }),
  });
  const data = await res.json();
  if (data.request) {
    return data;
  }
  return { request: data };
}

export async function toggleItemPurchased(
  requestId: string,
  itemId: string,
  purchased: boolean,
  itemNote?: string
): Promise<{ request: SupplyRequest }> {
  const res = await fetch(`${API_BASE}/requests/${requestId}/items/${itemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purchased, itemNote }),
  });
  return await res.json();
}

export async function fetchAnalytics(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/analytics`);
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function triggerNotification(title: string, body: string, targetRole?: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/notifications/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, targetRole }),
    });
  } catch (err) {
    console.error('Trigger error', err);
  }
}

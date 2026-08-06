import { Restaurant, Product, SupplyRequest, UserProfile, RequestStatus, RequestItem } from '../types';
import { INITIAL_USERS, INITIAL_RESTAURANTS, INITIAL_PRODUCTS_WITH_IDS } from '../data/caddyShackData';
import { getSupabaseClient, rowToRequest, requestToRow } from './supabase';

export class OperationalDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OperationalDataError';
  }
}

export function toOperationalDataError(_cause: unknown): OperationalDataError {
  return new OperationalDataError('No fue posible cargar las solicitudes. Revisa tu conexión e inténtalo de nuevo.');
}

// ── Static data ─────────────────────────────────────────────────────────────

export async function fetchRestaurants(): Promise<Restaurant[]> {
  return INITIAL_RESTAURANTS;
}

export async function fetchUsers(): Promise<UserProfile[]> {
  return INITIAL_USERS;
}

export async function fetchProducts(restaurantId?: string): Promise<Product[]> {
  if (restaurantId) return INITIAL_PRODUCTS_WITH_IDS.filter((p) => p.restaurantId === restaurantId);
  return INITIAL_PRODUCTS_WITH_IDS;
}

// ── Supply Requests via Supabase ────────────────────────────────────────────

export async function fetchSupplyRequests(restaurantId?: string, status?: string): Promise<SupplyRequest[]> {
  try {
    let query = getSupabaseClient()
      .from('sf_supply_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (restaurantId) query = query.eq('restaurant_id', restaurantId);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(rowToRequest);
  } catch (error) {
    throw toOperationalDataError(error);
  }
}

export async function upsertSupplyRequest(req: SupplyRequest): Promise<SupplyRequest> {
  const { data, error } = await getSupabaseClient()
    .from('sf_supply_requests')
    .upsert(requestToRow(req), { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return rowToRequest(data);
}

export async function getNextRequestNumber(): Promise<number> {
  const { data, error } = await getSupabaseClient()
    .from('sf_supply_requests')
    .select('request_number')
    .order('request_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return ((data as { request_number: number } | null)?.request_number ?? 100) + 1;
}

export async function claimSupplyRequest(requestId: string, buyerId: string, buyerName: string): Promise<SupplyRequest> {
  const now = new Date().toISOString();
  const { data, error } = await getSupabaseClient()
    .from('sf_supply_requests')
    .update({
      status: 'Asignada',
      assigned_buyer_id: buyerId,
      assigned_buyer_name: buyerName,
      assigned_at: now,
    })
    .eq('id', requestId)
    .select()
    .single();
  if (error) throw error;
  return rowToRequest(data);
}

export async function updateRequestStatus(
  requestId: string,
  status: RequestStatus,
  _buyerId?: string
): Promise<{ request: SupplyRequest; newPendingRequest?: SupplyRequest | null }> {
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { status };
  if (status === 'En Compra') updates.shopping_started_at = now;
  else if (status === 'Comprada') updates.purchased_at = now;
  else if (status === 'Entregada') updates.delivered_at = now;
  else if (status === 'Completada') updates.completed_at = now;

  const { data, error } = await getSupabaseClient()
    .from('sf_supply_requests')
    .update(updates)
    .eq('id', requestId)
    .select()
    .single();
  if (error) throw error;
  return { request: rowToRequest(data) };
}

export async function toggleItemPurchased(
  requestId: string,
  itemId: string,
  purchased: boolean,
  itemNote?: string
): Promise<{ request: SupplyRequest }> {
  const { data: current, error: fetchErr } = await getSupabaseClient()
    .from('sf_supply_requests')
    .select('items, status')
    .eq('id', requestId)
    .single();
  if (fetchErr) throw fetchErr;

  const now = new Date().toISOString();
  const updatedItems = (current.items as RequestItem[]).map((item) =>
    item.id === itemId
      ? { ...item, purchased, purchasedAt: purchased ? now : undefined, itemNote: itemNote ?? item.itemNote }
      : item
  );

  const allPurchased = updatedItems.length > 0 && updatedItems.every((i) => i.purchased);
  const updates: Record<string, unknown> = { items: updatedItems };
  if (allPurchased) {
    updates.status = 'Comprada';
    updates.purchased_at = now;
  }

  const { data, error } = await getSupabaseClient()
    .from('sf_supply_requests')
    .update(updates)
    .eq('id', requestId)
    .select()
    .single();
  if (error) throw error;
  return { request: rowToRequest(data) };
}

export async function submitDailyChecklist(
  restaurantId: string,
  userId: string,
  stockReadings: Record<string, number>,
  notes?: string,
  urgent?: boolean
): Promise<{ success: boolean; replenishmentCount: number; request: SupplyRequest | null }> {
  const restaurantProducts = INITIAL_PRODUCTS_WITH_IDS.filter(
    (p) => p.restaurantId === restaurantId && p.active
  );
  const restaurant = INITIAL_RESTAURANTS.find((r) => r.id === restaurantId);
  const user = INITIAL_USERS.find((u) => u.id === userId);

  const lowStockItems: RequestItem[] = restaurantProducts
    .filter((p) => (stockReadings[p.id] ?? p.minThreshold + 1) < p.minThreshold)
    .map((p, i) => ({
      id: `item-${Date.now()}-${i}`,
      productId: p.id,
      productName: p.name,
      category: p.category,
      unit: p.unit,
      currentStockAtRequest: stockReadings[p.id] ?? 0,
      minThreshold: p.minThreshold,
      requestedQty: p.suggestedQuantity,
      suggestedSupplier: p.suggestedSupplier,
      purchased: false,
    }));

  if (lowStockItems.length === 0) {
    return { success: true, replenishmentCount: 0, request: null };
  }

  const nextNumber = await getNextRequestNumber();
  const newReq: SupplyRequest = {
    id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    requestNumber: nextNumber,
    restaurantId,
    restaurantName: restaurant?.name ?? restaurantId,
    createdByUserId: userId,
    createdByUserName: user?.name ?? userId,
    status: 'Pendiente',
    items: lowStockItems,
    urgent: urgent ?? false,
    notes: notes ?? '',
    createdAt: new Date().toISOString(),
  };

  const { data, error } = await getSupabaseClient()
    .from('sf_supply_requests')
    .insert(requestToRow(newReq))
    .select()
    .single();
  if (error) throw error;
  return { success: true, replenishmentCount: lowStockItems.length, request: rowToRequest(data) };
}

// ── Products (local only for demo) ─────────────────────────────────────────

export async function createProduct(product: Omit<Product, 'id' | 'updatedAt'>): Promise<Product> {
  return { ...product, id: `prod-${Date.now()}`, updatedAt: new Date().toISOString() } as Product;
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
  const base = INITIAL_PRODUCTS_WITH_IDS.find((p) => p.id === id);
  return { ...(base ?? ({} as Product)), ...updates, id, updatedAt: new Date().toISOString() };
}

export async function deleteProduct(_id: string): Promise<boolean> {
  return true;
}

export async function fetchAnalytics(): Promise<unknown> {
  return null;
}

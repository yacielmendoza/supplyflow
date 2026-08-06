import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase';
import type { AuthenticatedProfile } from './auth';
import type { OperationalRequestStatus, RequestDraftItem } from './operations';

export interface OperationalLocation {
  id: string;
  name: string;
  address: string | null;
  active: boolean;
}

export interface OperationalSupplier {
  id: string;
  name: string;
  phone: string | null;
  active: boolean;
}

export interface OperationalProduct {
  id: string;
  locationId: string | null;
  name: string;
  category: string;
  unit: string;
  minThreshold: number;
  suggestedQuantity: number;
  active: boolean;
}

export interface OperationalRequestItem {
  id: string;
  productId: string | null;
  productName: string;
  unit: string;
  requestedQuantity: number;
  purchasedQuantity: number;
}

export interface OperationalRequest {
  id: string;
  number: number;
  locationId: string;
  status: OperationalRequestStatus;
  urgent: boolean;
  notes: string | null;
  assignedBuyerId: string | null;
  createdAt: string;
  items: OperationalRequestItem[];
}

export interface OperationalBuyer {
  id: string;
  fullName: string;
  email: string;
}

export interface OperationsSnapshot {
  locations: OperationalLocation[];
  products: OperationalProduct[];
  suppliers: OperationalSupplier[];
  requests: OperationalRequest[];
  buyers: OperationalBuyer[];
}

export class OperationsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OperationsError';
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) throw new OperationsError('Respuesta inválida del servidor.');
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  if (typeof value !== 'string') throw new OperationsError('Respuesta inválida del servidor.');
  return value;
}

function asOptionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) throw new OperationsError('Respuesta inválida del servidor.');
  return parsed;
}

function rows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.map(asRecord);
}

function ensureSuccess(error: { message: string } | null): void {
  if (error) throw new OperationsError(error.message);
}

function mapLocation(row: Record<string, unknown>): OperationalLocation {
  return { id: asString(row.id), name: asString(row.name), address: asOptionalString(row.address), active: row.active !== false };
}

function mapSupplier(row: Record<string, unknown>): OperationalSupplier {
  return { id: asString(row.id), name: asString(row.name), phone: asOptionalString(row.phone), active: row.active !== false };
}

function mapProduct(row: Record<string, unknown>): OperationalProduct {
  return {
    id: asString(row.id), locationId: asOptionalString(row.location_id), name: asString(row.name),
    category: asString(row.category), unit: asString(row.unit), minThreshold: asNumber(row.min_threshold),
    suggestedQuantity: asNumber(row.suggested_quantity), active: row.active !== false,
  };
}

function mapItem(row: Record<string, unknown>): OperationalRequestItem {
  return {
    id: asString(row.id), productId: asOptionalString(row.product_id), productName: asString(row.product_name_snapshot),
    unit: asString(row.unit_snapshot), requestedQuantity: asNumber(row.requested_quantity), purchasedQuantity: asNumber(row.purchased_quantity),
  };
}

function mapRequest(row: Record<string, unknown>): OperationalRequest {
  const rawItems = rows(row.supply_request_items);
  return {
    id: asString(row.id), number: asNumber(row.request_number), locationId: asString(row.location_id),
    status: asString(row.status) as OperationalRequestStatus, urgent: row.urgent === true, notes: asOptionalString(row.notes),
    assignedBuyerId: asOptionalString(row.assigned_buyer_id), createdAt: asString(row.created_at), items: rawItems.map(mapItem),
  };
}

export async function loadOperationsSnapshot(profile: AuthenticatedProfile): Promise<OperationsSnapshot> {
  const client = getSupabaseClient();
  const [locationResult, productResult, supplierResult, requestResult, buyerResult] = await Promise.all([
    client.from('locations').select('id,name,address,active').eq('organization_id', profile.organizationId).eq('active', true).order('name'),
    client.from('products').select('id,location_id,name,category,unit,min_threshold,suggested_quantity,active').eq('organization_id', profile.organizationId).eq('active', true).order('name'),
    client.from('suppliers').select('id,name,phone,active').eq('organization_id', profile.organizationId).eq('active', true).order('name'),
    client.from('supply_requests').select('id,request_number,location_id,status,urgent,notes,assigned_buyer_id,created_at,supply_request_items(id,product_id,product_name_snapshot,unit_snapshot,requested_quantity,purchased_quantity)').eq('organization_id', profile.organizationId).order('created_at', { ascending: false }),
    client.from('profiles').select('id,full_name,email').eq('organization_id', profile.organizationId).eq('role', 'buyer').order('full_name'),
  ]);
  ensureSuccess(locationResult.error);
  ensureSuccess(productResult.error);
  ensureSuccess(supplierResult.error);
  ensureSuccess(requestResult.error);
  if (buyerResult.error && profile.role === 'admin') ensureSuccess(buyerResult.error);
  return {
    locations: rows(locationResult.data).map(mapLocation),
    products: rows(productResult.data).map(mapProduct),
    suppliers: rows(supplierResult.data).map(mapSupplier),
    requests: rows(requestResult.data).map(mapRequest),
    buyers: buyerResult.error ? [] : rows(buyerResult.data).map((row) => ({ id: asString(row.id), fullName: asString(row.full_name), email: asString(row.email) })),
  };
}

export async function createSupplyRequest(input: { locationId: string; urgent: boolean; notes: string; items: RequestDraftItem[] }): Promise<void> {
  const { error } = await getSupabaseClient().rpc('create_supply_request', {
    p_location_id: input.locationId,
    p_urgent: input.urgent,
    p_notes: input.notes,
    p_items: input.items.map((item) => ({ product_id: item.productId, requested_quantity: item.quantity, current_stock: item.currentStock ?? null, item_note: item.note ?? null })),
  });
  ensureSuccess(error);
}

export async function transitionSupplyRequest(input: { requestId: string; status: OperationalRequestStatus; assignedBuyerId?: string; note?: string }): Promise<void> {
  const { error } = await getSupabaseClient().rpc('transition_supply_request', {
    p_request_id: input.requestId, p_new_status: input.status,
    p_assigned_buyer_id: input.assignedBuyerId ?? null, p_note: input.note ?? null,
  });
  ensureSuccess(error);
}

export async function recordItemPurchase(itemId: string, purchasedQuantity: number): Promise<void> {
  const { error } = await getSupabaseClient().rpc('record_request_item_purchase', { p_item_id: itemId, p_purchased_quantity: purchasedQuantity, p_note: null });
  ensureSuccess(error);
}

export async function createProduct(profile: AuthenticatedProfile, input: Omit<OperationalProduct, 'id' | 'active'>): Promise<void> {
  const { error } = await getSupabaseClient().from('products').insert({
    organization_id: profile.organizationId, location_id: input.locationId, name: input.name.trim(), category: input.category.trim(), unit: input.unit.trim(),
    min_threshold: input.minThreshold, suggested_quantity: input.suggestedQuantity,
  });
  ensureSuccess(error);
}

export async function createSupplier(profile: AuthenticatedProfile, name: string, phone: string): Promise<void> {
  const { error } = await getSupabaseClient().from('suppliers').insert({ organization_id: profile.organizationId, name: name.trim(), phone: phone.trim() || null });
  ensureSuccess(error);
}

export async function recordInventory(profile: AuthenticatedProfile, input: { locationId: string; productId: string; quantity: number; notes: string }): Promise<void> {
  const { error } = await getSupabaseClient().from('inventory_counts').insert({
    organization_id: profile.organizationId, location_id: input.locationId, product_id: input.productId,
    recorded_quantity: input.quantity, recorded_by: profile.id, notes: input.notes.trim() || null,
  });
  ensureSuccess(error);
}

export function subscribeToOperations(onChange: () => void): () => void {
  const client = getSupabaseClient();
  const channel: RealtimeChannel = client.channel('supplyflow-operations')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'supply_requests' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'supply_request_items' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_counts' }, onChange)
    .subscribe();
  return () => { void client.removeChannel(channel); };
}
